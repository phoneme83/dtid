package kr.knto.dtid.widget;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Color;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class QrUtil {

    private static final String PREFS = "dtid_widget";

    public static String getName(Context c) {
        return prefs(c).getString("name", "김관광");
    }

    public static String getMemberNo(Context c) {
        return prefs(c).getString("memberNo", "DT-2026-001234");
    }

    public static void save(Context c, String name, String memberNo) {
        prefs(c).edit().putString("name", name).putString("memberNo", memberNo).apply();
    }

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** 실제 서비스의 회전형 QR을 흉내내어 분 단위 타임스탬프를 포함한다. */
    public static String buildPayload(Context c) {
        String ts = new SimpleDateFormat("yyyyMMddHHmm", Locale.KOREA).format(new Date());
        return "DTID|" + getMemberNo(c) + "|" + getName(c) + "|" + ts;
    }

    public static Bitmap makeQr(String content, int sizePx) {
        try {
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
            hints.put(EncodeHintType.MARGIN, 1);
            BitMatrix m = new QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, sizePx, sizePx, hints);
            int w = m.getWidth(), h = m.getHeight();
            int[] pixels = new int[w * h];
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    pixels[y * w + x] = m.get(x, y) ? Color.BLACK : Color.WHITE;
                }
            }
            Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.RGB_565);
            bmp.setPixels(pixels, 0, w, 0, 0, w, h);
            return bmp;
        } catch (Exception e) {
            return null;
        }
    }
}
