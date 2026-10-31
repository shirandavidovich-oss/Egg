package com.shiran.egg;

import android.app.WallpaperManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.service.wallpaper.WallpaperService;
import android.view.SurfaceHolder;

import org.json.JSONObject;

import java.io.File;
import java.io.InputStream;
import java.util.Random;

/**
 * Live wallpaper: the pencil room, the nest, and the player's egg or creature behind the
 * home screen icons. It breathes, hops now and then (or when tapped), and the room shifts
 * with the phone's tilt like the game. The game tells it which drawing to show (setPet).
 */
public class EggWallpaper extends WallpaperService {

    static final String PREFS = "pet";

    @Override
    public Engine onCreateEngine() { return new PetEngine(); }

    Bitmap loadArt(String rel) {
        if (rel == null || rel.isEmpty()) return null;
        try (InputStream in = getAssets().open(rel)) { return BitmapFactory.decodeStream(in); } catch (Exception ignored) { }
        File f = new File(getFilesDir(), "cache/" + rel);
        if (f.exists()) return BitmapFactory.decodeFile(f.getPath());
        return null;
    }

    private static float clamp(float v, float lo, float hi) { return Math.max(lo, Math.min(hi, v)); }

    class PetEngine extends Engine implements SensorEventListener {
        private final Handler handler = new Handler(Looper.getMainLooper());
        private final Runnable tick = this::drawFrame;
        private final Paint bmp = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
        private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint line = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Random rnd = new Random();
        private SensorManager sensors;
        private Sensor gravity;
        private boolean visible;
        private int W, H;
        private float U, EYE, DEPTH, density;
        private Bitmap nest, pet, petColor, grain;
        private String petSig = "";
        private float ax = 0.503f, ay = 0.992f, hk = 1.014f;
        private float gx, gy = 0.7f, refx, refy = 0.7f, dx, dy;
        private boolean haveG;
        private float eyeX, eyeY, pageX, t, hop, nextHop = 5, rot;
        private long last;
        private RadialGradient vignette;
        private final RectF petRect = new RectF();

        @Override
        public void onCreate(SurfaceHolder holder) {
            super.onCreate(holder);
            density = getResources().getDisplayMetrics().density;
            sensors = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
            gravity = sensors.getDefaultSensor(Sensor.TYPE_GRAVITY);
            if (gravity == null) gravity = sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
            line.setStyle(Paint.Style.STROKE);
            line.setStrokeCap(Paint.Cap.ROUND);
            nest = loadArt("art/nest.webp");
            loadPet();
        }

        @Override
        public void onVisibilityChanged(boolean v) {
            visible = v;
            if (v) {
                loadPet();
                if (gravity != null) sensors.registerListener(this, gravity, SensorManager.SENSOR_DELAY_GAME);
                last = SystemClock.uptimeMillis();
                handler.post(tick);
            } else {
                sensors.unregisterListener(this);
                handler.removeCallbacks(tick);
            }
        }

        @Override
        public void onSurfaceChanged(SurfaceHolder holder, int format, int w, int h) {
            super.onSurfaceChanged(holder, format, w, h);
            W = w; H = h; U = Math.min(W, H);
            EYE = (float) (1.5 * Math.hypot(W, H));
            DEPTH = 1.1f * U;
            bakeGrain();
            vignette = new RadialGradient(W / 2f, H / 2f, (float) Math.hypot(W, H) * 0.62f,
                    new int[]{0x00000000, 0x00000000, 0x38141418}, new float[]{0f, 0.55f, 1f}, Shader.TileMode.CLAMP);
            last = SystemClock.uptimeMillis();
            drawFrame();
        }

        @Override
        public void onSurfaceDestroyed(SurfaceHolder holder) {
            visible = false;
            handler.removeCallbacks(tick);
            sensors.unregisterListener(this);
            super.onSurfaceDestroyed(holder);
        }

        @Override
        public void onDestroy() {
            handler.removeCallbacks(tick);
            sensors.unregisterListener(this);
            super.onDestroy();
        }

        @Override
        public void onOffsetsChanged(float xOffset, float yOffset, float xStep, float yStep, int xPixels, int yPixels) {
            pageX = xOffset - 0.5f;          // swiping between home pages turns the room a little
        }

        @Override
        public Bundle onCommand(String action, int x, int y, int z, Bundle extras, boolean resultRequested) {
            if (WallpaperManager.COMMAND_TAP.equals(action)) {
                RectF r = new RectF(petRect);
                r.inset(-U * 0.08f, -U * 0.08f);
                if (r.contains(x, y)) hop = 1;
            }
            return null;
        }

        @Override
        public void onSensorChanged(SensorEvent e) {
            float x = e.values[0], y = e.values[1], z = e.values[2];
            float m = (float) Math.sqrt(x * x + y * y + z * z);
            if (m == 0) return;
            gx = x / m; gy = y / m;
            if (!haveG) { refx = gx; refy = gy; haveG = true; }
        }

        @Override
        public void onAccuracyChanged(Sensor sensor, int accuracy) { }

        private void loadPet() {
            SharedPreferences p = getSharedPreferences(PREFS, MODE_PRIVATE);
            String sig = p.getString("pet", "");
            if (sig.equals(petSig) && pet != null) return;
            petSig = sig;
            try {
                JSONObject o = new JSONObject(sig);
                Bitmap b = loadArt(o.getString("img"));
                if (b == null) throw new Exception("missing");
                pet = b;
                petColor = loadArt(o.optString("color", ""));
                ax = (float) o.optDouble("ax", 0.5);
                ay = (float) o.optDouble("ay", 0.96);
                hk = (float) o.optDouble("hk", 0.95);
            } catch (Exception e) {
                pet = loadArt("art/pose_crack1.webp");
                petColor = null;
                ax = 0.503f; ay = 0.992f; hk = 1.014f;
            }
        }

        private void bakeGrain() {
            int gw = Math.max(1, W / 2), gh = Math.max(1, H / 2);
            grain = Bitmap.createBitmap(gw, gh, Bitmap.Config.ARGB_8888);
            Canvas g = new Canvas(grain);
            Random r = new Random(3);
            Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
            p.setStrokeCap(Paint.Cap.ROUND);
            int n = gw * gh / 60;
            for (int i = 0; i < n; i++) {
                float x = r.nextFloat() * gw, y = r.nextFloat() * gh;
                float ex = Math.min(x, gw - x) / (gw / 2f), ey = Math.min(y, gh - y) / (gh / 2f);
                float edge = 1 - Math.min(ex, ey);
                if (r.nextFloat() > 0.25f + edge * 0.75f) continue;
                float len = (4 + r.nextFloat() * 10) * density * 0.5f;
                double a = -0.9 + (r.nextFloat() - 0.5) * 0.25;
                p.setColor(Color.argb((int) ((0.03f + r.nextFloat() * 0.07f) * 255), 40, 40, 44));
                p.setStrokeWidth((0.6f + r.nextFloat() * 0.7f) * density * 0.5f);
                g.drawLine(x, y, x + (float) Math.cos(a) * len, y + (float) Math.sin(a) * len, p);
            }
            p.setStrokeWidth(0);
            for (int i = 0; i < gw * gh / 40; i++) {
                p.setColor(r.nextBoolean() ? 0x09000000 : 0x0DFFFFFF);
                g.drawPoint(r.nextFloat() * gw, r.nextFloat() * gh, p);
            }
        }

        private float sc(float z) { return EYE / (EYE - z); }
        private float px(float x, float z) { return W / 2f + eyeX + (x - eyeX) * sc(z); }
        private float py(float y, float z) { return H / 2f + eyeY + (y - eyeY) * sc(z); }

        private void drawFrame() {
            handler.removeCallbacks(tick);
            if (W == 0) return;
            long now = SystemClock.uptimeMillis();
            float dt = Math.min(0.05f, (now - last) / 1000f);
            last = now;
            t += dt;

            // tilt: the held angle slowly becomes "level", like in the game
            float k = 1 - (float) Math.exp(-dt / 14);
            refx += (gx - refx) * k; refy += (gy - refy) * k;
            float tx = clamp(gx - refx, -0.8f, 0.8f), ty = clamp(gy - refy, -0.8f, 0.8f);
            float s = 1 - (float) Math.exp(-dt / 0.12);
            dx += (tx - dx) * s; dy += (ty - dy) * s;
            float ex = dx * U * 1.2f + pageX * U * 0.35f, ey = -dy * U * 1.2f;
            eyeX += (clamp(ex, -0.7f * U, 0.7f * U) - eyeX) * s;
            eyeY += (clamp(ey, -0.7f * U, 0.7f * U) - eyeY) * s;

            // a little life: an occasional hop, a sway that follows the tilt
            nextHop -= dt;
            if (nextHop <= 0) { hop = 1; nextHop = 7 + rnd.nextFloat() * 10; }
            hop = Math.max(0, hop - dt / 0.6f);
            rot += ((-dx * 0.4f + (float) Math.sin(t * 1.3) * 0.03f) - rot) * s;

            SurfaceHolder holder = getSurfaceHolder();
            Canvas c = null;
            try {
                c = holder.lockHardwareCanvas();
                if (c != null) draw(c);
            } catch (Exception ignored) {
            } finally {
                if (c != null) try { holder.unlockCanvasAndPost(c); } catch (Exception ignored) { }
            }
            if (visible) handler.postDelayed(tick, 33);
        }

        private void draw(Canvas c) {
            c.drawColor(0xFFECEBE8);
            fill.setShader(null);
            fill.setStyle(Paint.Style.FILL);

            // the room: frames from the glass to the back wall, darker as they go deeper
            int N = 24;
            float rc = U * 0.06f;
            for (int i = N; i >= 0; i--) {
                float tt = i / (float) N, z = -DEPTH * tt, f = sc(z);
                float x0 = px(-W / 2f, z), y0 = py(-H / 2f, z);
                int v = Math.round(232 + (168 - 232) * (float) Math.pow(tt, 0.8));
                fill.setColor(Color.rgb(v, v, Math.min(255, v + 2)));
                Path p = new Path();
                p.setFillType(Path.FillType.EVEN_ODD);
                p.addRect(-10, -10, W + 10, H + 10, Path.Direction.CW);
                p.addRoundRect(new RectF(x0, y0, x0 + W * f, y0 + H * f), rc * f, rc * f, Path.Direction.CW);
                c.drawPath(p, fill);
            }
            float bf = sc(-DEPTH), bx = px(-W / 2f, -DEPTH), by = py(-H / 2f, -DEPTH);
            RectF back = new RectF(bx, by, bx + W * bf, by + H * bf);
            fill.setColor(Color.rgb(198, 198, 200));
            c.drawRoundRect(back, rc * bf, rc * bf, fill);
            line.setColor(0x591E1E22);
            line.setStrokeWidth(1.2f * density);
            int[][] corners = {{-1, -1}, {1, -1}, {1, 1}, {-1, 1}};
            for (int[] q : corners) {
                c.drawLine(px(q[0] * W / 2f, 0), py(q[1] * H / 2f, 0), px(q[0] * W / 2f, -DEPTH), py(q[1] * H / 2f, -DEPTH), line);
            }
            line.setColor(0x4D1E1E22);
            c.drawRoundRect(back, rc * bf, rc * bf, line);
            line.setColor(0x1F1E1E22);
            line.setStrokeWidth(1f * density);
            for (int i = 1; i < 7; i++) {
                float z = -DEPTH * (i / 7f);
                c.drawLine(px(-W / 2f, z), py(H / 2f, z), px(W / 2f, z), py(H / 2f, z), line);
            }

            if (nest != null) {
                float zN = -DEPTH * 0.45f, f = sc(zN);
                float nestW = Math.min(W * 1.05f, U * 1.15f) / f * 0.9f;
                float nestH = nestW * nest.getHeight() / nest.getWidth();
                float nestTop = H / 2f - nestH * 0.98f;
                float nx = px(-nestW / 2f, zN), ny = py(nestTop, zN), nw = nestW * f, nh = nestH * f;
                RectF nestRect = new RectF(nx, ny, nx + nw, ny + nh);

                // the nest's shadow on the floor
                float sx = px(0, zN), sy = py(H / 2f, zN) - nh * 0.04f;
                fill.setShader(new RadialGradient(sx, sy, nw * 0.55f, 0x59141418, 0x00141418, Shader.TileMode.CLAMP));
                c.save(); c.scale(1, 0.18f, sx, sy); c.drawCircle(sx, sy, nw * 0.55f, fill); c.restore();
                fill.setShader(null);
                c.drawBitmap(nest, null, nestRect, bmp);

                // the egg or creature, standing in the bowl
                if (pet != null) {
                    float footY = nestTop + nestH * 0.53f, zE = zN + nestW * 0.02f, fe = sc(zE);
                    float fx = px(0, zE), fy = py(footY, zE);
                    float eggH = nestW * 0.62f * fe;
                    float ph = eggH * hk, pw = ph * pet.getWidth() / pet.getHeight();
                    float breathe = 1 + (float) Math.sin(t * 2.2) * 0.015f;
                    float hopY = (float) Math.sin(hop * Math.PI) * eggH * 0.12f;
                    // shadow, smaller while it is in the air
                    float sh = eggH * 0.42f * (1 - hop * 0.3f);
                    fill.setShader(new RadialGradient(fx, fy, sh, 0x61141418, 0x00141418, Shader.TileMode.CLAMP));
                    c.save(); c.scale(1, 0.2f, fx, fy); c.drawCircle(fx, fy, sh, fill); c.restore();
                    fill.setShader(null);
                    c.save();
                    c.translate(fx, fy - hopY);
                    c.rotate((float) Math.toDegrees(rot));
                    c.scale(2 - breathe, breathe);
                    RectF r = new RectF(-ax * pw, -ay * ph, (1 - ax) * pw, (1 - ay) * ph);
                    c.drawBitmap(pet, null, r, bmp);
                    if (petColor != null) c.drawBitmap(petColor, null, r, bmp);
                    c.restore();
                    petRect.set(fx - pw / 2, fy - ph - hopY, fx + pw / 2, fy);
                }

                // the front rim of the nest, so the feet stand inside it
                float lcx = nx + nw * 0.505f, lcy = ny + nh * 0.40f, lrx = nw * 0.36f, lry = nh * 0.17f;
                Path clip = new Path();
                clip.moveTo(nx - 2, lcy);
                clip.lineTo(lcx - lrx, lcy);
                clip.arcTo(new RectF(lcx - lrx, lcy - lry, lcx + lrx, lcy + lry), 180, -180, false);
                clip.lineTo(nx + nw + 2, lcy);
                clip.lineTo(nx + nw + 2, ny + nh + 2);
                clip.lineTo(nx - 2, ny + nh + 2);
                clip.close();
                c.save();
                c.clipPath(clip);
                c.drawBitmap(nest, null, nestRect, bmp);
                c.restore();
            }

            if (grain != null) c.drawBitmap(grain, null, new RectF(0, 0, W, H), bmp);
            if (vignette != null) { fill.setShader(vignette); c.drawRect(0, 0, W, H, fill); fill.setShader(null); }
        }
    }
}
