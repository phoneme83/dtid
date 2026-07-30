package kr.knto.dtid.siteapp;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** 설정·공지 JSON을 받아오기 위한 최소 HTTP 도구. 외부 라이브러리를 쓰지 않는다. */
final class Http {

    private Http() {
    }

    /** 실패 시 예외를 던지지 않고 null 을 반환한다(앱 구동을 막지 않기 위함). */
    static String get(String url, int timeoutMs) {
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setConnectTimeout(timeoutMs);
            conn.setReadTimeout(timeoutMs);
            conn.setRequestProperty("Cache-Control", "no-cache");
            conn.setUseCaches(false);
            if (conn.getResponseCode() != 200) {
                return null;
            }
            try (InputStream in = conn.getInputStream()) {
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                byte[] buf = new byte[4096];
                int n;
                while ((n = in.read(buf)) > 0) {
                    bos.write(buf, 0, n);
                }
                return new String(bos.toByteArray(), "UTF-8");
            }
        } catch (Exception e) {
            return null;
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }
}
