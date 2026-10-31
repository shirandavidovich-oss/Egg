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
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayOutputStream;
import java.io.ByteArrayInputStream;
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
 *  built into the app.
 *
 *  Drawings and sounds the page asks for (art/..., sound/...) come from the app itself;
 *  a file the app does not have yet is downloaded once from GitHub and kept. So new art
 *  needs a new file name, not a reinstall. */
public class MainActivity extends Activity implements SensorEventListener {

    private WebView web;
    private SensorManager sensors;
    private Sensor gravity;
    private Sensor motion;
    private PhoneLink link;
    private android.speech.tts.TextToSpeech tts;
    private boolean ttsReady = false;
    private long lastShakeSent = 0;
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
        web.addJavascriptInterface(new Bridge(), "EggNative");
        link = new PhoneLink(this, (event, data) -> {
            if (!pageReady) return;
            web.evaluateJavascript("window.eggTrade&&eggTrade(" + org.json.JSONObject.quote(event) + "," + org.json.JSONObject.quote(data) + ")", null);
        });
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) { pageReady = true; }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                if (!"egg.game".equals(req.getUrl().getHost())) return null;
                String path = req.getUrl().getPath();
                if (path == null || path.length() < 2 || path.contains("..")) return null;
                byte[] data = gameFile(path.substring(1));
                if (data == null) return new WebResourceResponse("text/plain", "utf-8", 404, "Not found",
                        java.util.Collections.singletonMap("Access-Control-Allow-Origin", "*"), new ByteArrayInputStream(new byte[0]));
                WebResourceResponse r = new WebResourceResponse(mime(path), null, new ByteArrayInputStream(data));
                r.setResponseHeaders(java.util.Collections.singletonMap("Access-Control-Allow-Origin", "*"));
                return r;
            }
        });
        setContentView(web);
        loadGame();

        // a voice for the dog (Hebrew, from the phone's own text-to-speech)
        tts = new android.speech.tts.TextToSpeech(this, status -> {
            if (status != android.speech.tts.TextToSpeech.SUCCESS) return;
            int r = tts.setLanguage(new java.util.Locale("he", "IL"));
            ttsReady = r != android.speech.tts.TextToSpeech.LANG_MISSING_DATA && r != android.speech.tts.TextToSpeech.LANG_NOT_SUPPORTED;
        });

        sensors = (SensorManager) getSystemService(SENSOR_SERVICE);
        gravity = sensors.getDefaultSensor(Sensor.TYPE_GRAVITY);
        if (gravity == null) gravity = sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        motion = sensors.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION);

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

    /** A drawing or sound for the page: from the app, else saved earlier, else GitHub (then saved). */
    private byte[] gameFile(String rel) {
        try { return readBytes(getAssets().open(rel)); } catch (Exception ignored) { }
        File cached = new File(getFilesDir(), "cache/" + rel);
        try { if (cached.exists()) return readBytes(new java.io.FileInputStream(cached)); } catch (Exception ignored) { }
        try {
            HttpURLConnection c = (HttpURLConnection) new URL("https://raw.githubusercontent.com/" + REPO
                    + "/main/app/src/main/assets/" + rel).openConnection();
            c.setConnectTimeout(5000);
            c.setReadTimeout(15000);
            if (c.getResponseCode() != 200) return null;
            byte[] data = readBytes(c.getInputStream());
            cached.getParentFile().mkdirs();
            try (FileOutputStream o = new FileOutputStream(cached)) { o.write(data); }
            return data;
        } catch (Exception e) {
            return null;
        }
    }

    private static byte[] readBytes(InputStream in) throws Exception {
        try (InputStream i = in) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = i.read(buf)) > 0) out.write(buf, 0, n);
            return out.toByteArray();
        }
    }

    private static String mime(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".ogg")) return "audio/ogg";
        if (p.endsWith(".wav")) return "audio/wav";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".js")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        return "application/octet-stream";
    }

    /** Things the page can ask the phone to do. */
    private class Bridge {
        @JavascriptInterface
        public void vibrate(int ms) {
            Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) return;
            int len = Math.max(5, Math.min(ms, 400));
            if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(len, VibrationEffect.DEFAULT_AMPLITUDE));
            else v.vibrate(len);
        }

        @JavascriptInterface
        public void speak(String text, float pitch, float rate) {
            if (!ttsReady) return;
            tts.setPitch(pitch);
            tts.setSpeechRate(rate);
            tts.speak(text, android.speech.tts.TextToSpeech.QUEUE_FLUSH, null, "dog");
        }

        // the live wallpaper (see EggWallpaper): which drawing to show, and opening its preview
        @JavascriptInterface
        public void setPet(String json) {
            getSharedPreferences(EggWallpaper.PREFS, MODE_PRIVATE).edit().putString("pet", json).apply();
        }

        @JavascriptInterface
        public void setWallpaper() {
            main.post(() -> {
                try {
                    android.content.Intent i = new android.content.Intent(android.app.WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
                    i.putExtra(android.app.WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                            new android.content.ComponentName(MainActivity.this, EggWallpaper.class));
                    startActivity(i);
                } catch (Exception e) {
                    try { startActivity(new android.content.Intent(android.app.WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER)); }
                    catch (Exception ignored) { }
                }
            });
        }

        // the direct phone-to-phone link (see PhoneLink)
        @JavascriptInterface
        public void tradeStart(String name) { main.post(() -> link.start(name)); }

        @JavascriptInterface
        public void tradeSend(String message) { main.post(() -> link.send(message)); }

        @JavascriptInterface
        public void tradeStop() { main.post(() -> link.stop()); }
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
        if (motion != null) sensors.registerListener(this, motion, SensorManager.SENSOR_DELAY_GAME);
        if (pageReady) web.evaluateJavascript("window.eggResume&&eggResume()", null);
        hideSystemBars();
    }

    @Override
    protected void onPause() {
        sensors.unregisterListener(this);
        if (pageReady) web.evaluateJavascript("window.eggPause&&eggPause()", null);
        web.onPause();
        super.onPause();
    }

    // Android back: the game closes its own pages and bubbles first; at home it leaves the app
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (!pageReady) { super.onBackPressed(); return; }
        web.evaluateJavascript("(window.eggBack && window.eggBack()) ? 'handled' : 'leave'", value -> {
            if (value == null || !value.contains("handled")) MainActivity.super.onBackPressed();
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        link.onPermissionResult(requestCode, results);
    }

    @Override
    protected void onDestroy() {
        link.stop();
        if (tts != null) tts.shutdown();
        super.onDestroy();
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
        if (e.sensor.getType() == Sensor.TYPE_LINEAR_ACCELERATION) {
            float m = (float) Math.sqrt(e.values[0] * e.values[0] + e.values[1] * e.values[1] + e.values[2] * e.values[2]);
            if (m > 8 && now - lastShakeSent > 120) {
                lastShakeSent = now;
                web.evaluateJavascript("window.eggShake&&eggShake(" + m + ")", null);
            }
            return;
        }
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
