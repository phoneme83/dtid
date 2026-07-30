package kr.knto.dtid.siteapp;

import android.content.Context;

import org.json.JSONObject;

/**
 * 앱 접속 시 서버의 version.json 을 확인해 갱신 사항을 반영한다.
 *
 * 두 갈래로 나뉜다.
 *  1) 웹 자원(UI/UX·화면·기능) — webVersion 이 바뀌면 WebView 캐시를 비우고 다시 읽어
 *     스토어 갱신 없이 즉시 반영된다.
 *  2) 앱 자체(네이티브 셸) — minVersionCode 보다 낮으면 갱신을 안내한다.
 */
final class UpdateChecker {

    static final class Result {
        /** 웹 자원 버전이 바뀌어 캐시를 비우고 다시 읽어야 하는 경우 */
        boolean reloadWeb;
        /** 앱 셸 자체를 갱신해야 하는 경우 */
        boolean appUpdate;
        /** 갱신을 강제해야 하는지(미갱신 시 이용 제한) */
        boolean force;
        String message = "";
        String apkUrl = "";
    }

    private UpdateChecker() {
    }

    /** 네트워크 호출이 포함되므로 반드시 백그라운드 스레드에서 호출한다. */
    static Result check(Context c) {
        Result r = new Result();
        String json = Http.get(Prefs.baseUrl(c) + "version.json", 4000);
        if (json == null) {
            // 서버에 닿지 않으면 기존 상태로 그대로 구동한다.
            return r;
        }
        try {
            JSONObject o = new JSONObject(json);

            String webVersion = o.optString("webVersion", "");
            if (!webVersion.isEmpty() && !webVersion.equals(Prefs.webVersion(c))) {
                r.reloadWeb = true;
                Prefs.setWebVersion(c, webVersion);
            }

            int minCode = o.optInt("minVersionCode", 0);
            int latestCode = o.optInt("latestVersionCode", 0);
            int current = currentVersionCode(c);

            r.apkUrl = o.optString("apkUrlPrefix", "") + "dtid-site" + BuildConfig.SITE_CODE + ".apk";
            if (o.has("apkUrl")) {
                r.apkUrl = o.optString("apkUrl");
            }

            if (current < minCode) {
                r.appUpdate = true;
                r.force = true;
                r.message = o.optString("forceMessage",
                        "필수 업데이트가 있습니다. 갱신 후 이용해 주세요.");
            } else if (current < latestCode) {
                r.appUpdate = true;
                r.force = false;
                r.message = o.optString("updateMessage",
                        "새 버전이 있습니다. 지금 갱신하시겠습니까?");
            }
        } catch (Exception ignored) {
            // 형식 오류 시에도 앱은 정상 구동시킨다.
        }
        return r;
    }

    static int currentVersionCode(Context c) {
        try {
            return c.getPackageManager().getPackageInfo(c.getPackageName(), 0).versionCode;
        } catch (Exception e) {
            return 0;
        }
    }
}
