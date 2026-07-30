package kr.knto.dtid.siteapp;

import android.content.Context;
import android.content.SharedPreferences;

/** 서버 주소·알림 확인 시점 등 앱 설정 보관. */
public final class Prefs {

    private static final String FILE = "dtid_siteapp";
    private static final String K_BASE_URL = "base_url";
    private static final String K_LAST_NOTICE = "last_notice_ts";
    private static final String K_WEB_VERSION = "web_version";

    private Prefs() {
    }

    private static SharedPreferences sp(Context c) {
        return c.getSharedPreferences(FILE, Context.MODE_PRIVATE);
    }

    /** 시안 웹페이지가 올라가 있는 서버 주소. 항상 '/' 로 끝나도록 정리해서 반환한다. */
    public static String baseUrl(Context c) {
        String v = sp(c).getString(K_BASE_URL, BuildConfig.DEFAULT_BASE_URL);
        if (v == null || v.trim().isEmpty()) {
            v = BuildConfig.DEFAULT_BASE_URL;
        }
        v = v.trim();
        return v.endsWith("/") ? v : v + "/";
    }

    public static void setBaseUrl(Context c, String url) {
        sp(c).edit().putString(K_BASE_URL, url).apply();
    }

    /** 시안 시작 페이지 전체 URL. */
    public static String startUrl(Context c) {
        return baseUrl(c) + BuildConfig.START_PATH;
    }

    /** 이미 알림으로 띄운 공지의 최신 시각(문자열 비교용, "YYYY-MM-DD HH:MM" 형식). */
    public static String lastNoticeTs(Context c) {
        return sp(c).getString(K_LAST_NOTICE, "");
    }

    public static void setLastNoticeTs(Context c, String ts) {
        sp(c).edit().putString(K_LAST_NOTICE, ts).apply();
    }

    /** 마지막으로 적용한 웹 자원 버전. 값이 바뀌면 WebView 캐시를 비우고 다시 읽는다. */
    public static String webVersion(Context c) {
        return sp(c).getString(K_WEB_VERSION, "");
    }

    public static void setWebVersion(Context c, String v) {
        sp(c).edit().putString(K_WEB_VERSION, v).apply();
    }
}
