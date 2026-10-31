package com.shiran.egg;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;

import com.google.android.gms.nearby.Nearby;
import com.google.android.gms.nearby.connection.AdvertisingOptions;
import com.google.android.gms.nearby.connection.ConnectionInfo;
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback;
import com.google.android.gms.nearby.connection.ConnectionResolution;
import com.google.android.gms.nearby.connection.ConnectionsClient;
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo;
import com.google.android.gms.nearby.connection.DiscoveryOptions;
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback;
import com.google.android.gms.nearby.connection.Payload;
import com.google.android.gms.nearby.connection.PayloadCallback;
import com.google.android.gms.nearby.connection.PayloadTransferUpdate;
import com.google.android.gms.nearby.connection.Strategy;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * A direct link between two phones running the game: Bluetooth / Wi-Fi via Google's
 * Nearby Connections. No server, no internet. Both phones look for each other at the same
 * time; the one with the smaller random name calls the other, so they never call at once.
 *
 * Reusable: the page sends and receives short text messages; what they mean is up to the game.
 */
public class PhoneLink {

    public interface Listener { void onLinkEvent(String event, String data); }

    private static final String SERVICE_ID = "com.shiran.egg.link";
    static final int PERMISSION_REQUEST = 7301;

    private final Activity activity;
    private final Listener listener;
    private final Handler main = new Handler(Looper.getMainLooper());
    private ConnectionsClient client;
    private String myName;
    private String peer;            // connected endpoint
    private boolean calling = false;
    private String pendingName;     // waiting for permission

    public PhoneLink(Activity activity, Listener listener) {
        this.activity = activity;
        this.listener = listener;
    }

    public void start(String name) {
        stop();
        myName = name;
        if (!hasPermissions()) {
            pendingName = name;
            activity.requestPermissions(neededPermissions(), PERMISSION_REQUEST);
            return;
        }
        client = Nearby.getConnectionsClient(activity);
        Strategy s = Strategy.P2P_POINT_TO_POINT;
        client.startAdvertising(myName, SERVICE_ID, lifecycle, new AdvertisingOptions.Builder().setStrategy(s).build())
                .addOnFailureListener(e -> emit("error", "advertise: " + e.getMessage()));
        client.startDiscovery(SERVICE_ID, discovery, new DiscoveryOptions.Builder().setStrategy(s).build())
                .addOnFailureListener(e -> emit("error", "discover: " + e.getMessage()));
        emit("searching", "");
    }

    public void send(String text) {
        if (client == null || peer == null) return;
        client.sendPayload(peer, Payload.fromBytes(text.getBytes(StandardCharsets.UTF_8)));
    }

    public void stop() {
        if (client != null) {
            client.stopAdvertising();
            client.stopDiscovery();
            client.stopAllEndpoints();
        }
        client = null;
        peer = null;
        calling = false;
    }

    /** Call from the activity's onRequestPermissionsResult. */
    public void onPermissionResult(int requestCode, int[] results) {
        if (requestCode != PERMISSION_REQUEST || pendingName == null) return;
        String name = pendingName;
        pendingName = null;
        for (int r : results) if (r != PackageManager.PERMISSION_GRANTED) { emit("denied", ""); return; }
        start(name);
    }

    private final EndpointDiscoveryCallback discovery = new EndpointDiscoveryCallback() {
        @Override
        public void onEndpointFound(@NonNull String endpointId, @NonNull DiscoveredEndpointInfo info) {
            if (client == null || peer != null || calling) return;
            String theirs = info.getEndpointName();
            // only the phone with the smaller name calls, so the two never call each other at once
            if (myName.compareTo(theirs) < 0) {
                calling = true;
                client.requestConnection(myName, endpointId, lifecycle)
                        .addOnFailureListener(e -> { calling = false; });
            }
        }

        @Override
        public void onEndpointLost(@NonNull String endpointId) { }
    };

    private final ConnectionLifecycleCallback lifecycle = new ConnectionLifecycleCallback() {
        @Override
        public void onConnectionInitiated(@NonNull String endpointId, @NonNull ConnectionInfo info) {
            // players agree inside the game, so the link itself is accepted right away
            if (client != null) client.acceptConnection(endpointId, payloads);
        }

        @Override
        public void onConnectionResult(@NonNull String endpointId, @NonNull ConnectionResolution result) {
            calling = false;
            if (client == null) return;
            if (result.getStatus().isSuccess()) {
                peer = endpointId;
                client.stopAdvertising();
                client.stopDiscovery();
                emit("connected", "");
            }
        }

        @Override
        public void onDisconnected(@NonNull String endpointId) {
            if (endpointId.equals(peer)) { peer = null; emit("lost", ""); }
        }
    };

    private final PayloadCallback payloads = new PayloadCallback() {
        @Override
        public void onPayloadReceived(@NonNull String endpointId, @NonNull Payload payload) {
            if (payload.getType() == Payload.Type.BYTES && payload.asBytes() != null) {
                emit("message", new String(payload.asBytes(), StandardCharsets.UTF_8));
            }
        }

        @Override
        public void onPayloadTransferUpdate(@NonNull String endpointId, @NonNull PayloadTransferUpdate update) { }
    };

    private void emit(String event, String data) { main.post(() -> listener.onLinkEvent(event, data)); }

    private boolean hasPermissions() {
        for (String p : neededPermissions()) if (activity.checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) return false;
        return true;
    }

    private static String[] neededPermissions() {
        List<String> p = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= 31) {
            p.add(Manifest.permission.BLUETOOTH_SCAN);
            p.add(Manifest.permission.BLUETOOTH_ADVERTISE);
            p.add(Manifest.permission.BLUETOOTH_CONNECT);
        }
        if (Build.VERSION.SDK_INT >= 33) p.add(Manifest.permission.NEARBY_WIFI_DEVICES);
        else p.add(Manifest.permission.ACCESS_FINE_LOCATION);
        return p.toArray(new String[0]);
    }
}
