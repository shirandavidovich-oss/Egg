package com.shiran.egg;

import android.app.Activity;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** The whole game lives in index.html. This screen shows it full screen and feeds it
 *  the phone's tilt from the gravity sensor.
 *
 *  Updates without reinstalling: on every launch the app fetches the newest index.html
 *  from GitHub and keeps a copy. Offline, it uses the last copy it saved, or the one
 *  built into the app. */
public class MainActivity extends Activity implements SensorEventListener {

    private WebView web;
    private SensorManager sensors;
    private Sensor gravity;
    private boolean pageReady = false;
    private long lastSent = 0;

    private static final String REPO = "shirandavidovich-oss/Egg";
    private static final String GAME_PATH = "app/src/main/assets/index.html";
    private static final long WAIT_FOR_UPDATE_MS = 2500;

    private final Handler main = new Handler(Looper.getMainLooper());
    private boolean loaded = false;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setBackgroundColor(0xFF120A10);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) { pageReady = true; }
        });
        setContentView(web);
        loadGame();

        sensors = (SensorManager) getSystemService(SENSOR_SERVICE);
        gravity = sensors.getDefaultSensor(Sensor.TYPE_GRAVITY);
        if (gravity == null) gravity = sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);

        hideSystemBars();
    }

    // ---------- loading the newest game ----------

    private File savedCopy() { return new File(getFilesDir(), "game.html"); }

    private void loadGame() {
        // if the download is slow, start with what we have and use the new one next time
        main.postDelayed(() -> showGame(readLocal()), WAIT_FOR_UPDATE_MS);
        new Thread(() -> {
            try {
                String html = fetchLatest();
                writeFile(savedCopy(), html);
                main.post(() -> showGame(html));
            } catch (Exception e) {
                main.post(() -> showGame(readLocal()));
            }
        }).start();
    }

    private void showGame(String html) {
        if (loaded || html == null) return;
        loaded = true;
        web.loadDataWithBaseURL("https://egg.game/", html, "text/html", "utf-8", null);
    }

    private String readLocal() {
        try {
            File f = savedCopy();
            if (f.exists() && f.length() > 1000) return readAll(new java.io.FileInputStream(f));
            return readAll(getAssets().open("index.html"));
        } catch (Exception e) {
            return "<body style='background:#120a10'></body>";
        }
    }

    private String fetchLatest() throws Exception {
        // ask for the newest commit, then fetch the game file at exactly that commit (never stale)
        String info = get("https://api.github.com/repos/" + REPO + "/commits/main");
        Matcher m = Pattern.compile("\"sha\"\\s*:\\s*\"([0-9a-f]{40})\"").matcher(info);
        if (!m.find()) throw new Exception("no commit");
        String html = get("https://raw.githubusercontent.com/" + REPO + "/" + m.group(1) + "/" + GAME_PATH);
        if (!html.contains("<canvas")) throw new Exception("bad file");
        return html;
    }

    private static String get(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(4000);
        c.setReadTimeout(6000);
        c.setRequestProperty("User-Agent", "EggGame");
        try {
            if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
            return readAll(c.getInputStream());
        } finally {
            c.disconnect();
        }
    }

    private static String readAll(InputStream in) throws Exception {
        try (InputStream i = in) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = i.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    private static void writeFile(File f, String text) throws Exception {
        File tmp = new File(f.getPath() + ".tmp");
        try (FileOutputStream o = new FileOutputStream(tmp)) {
            o.write(text.getBytes(StandardCharsets.UTF_8));
        }
        if (!tmp.renameTo(f)) throw new Exception("save failed");
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        if (gravity != null) sensors.registerListener(this, gravity, SensorManager.SENSOR_DELAY_GAME);
        hideSystemBars();
    }

    @Override
    protected void onPause() {
        sensors.unregisterListener(this);
        web.onPause();
        super.onPause();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    @Override
    public void onSensorChanged(SensorEvent e) {
        if (!pageReady) return;
        long now = System.currentTimeMillis();
        if (now - lastSent < 15) return;
        lastSent = now;
        String js = "window.eggGravity&&eggGravity(" + e.values[0] + "," + e.values[1] + "," + e.values[2] + ")";
        web.evaluateJavascript(js, null);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) { }

    @SuppressWarnings("deprecation")
    private void hideSystemBars() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }
}
