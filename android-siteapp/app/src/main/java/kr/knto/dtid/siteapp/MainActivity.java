package kr.knto.dtid.siteapp;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.text.InputType;
import android.util.Base64;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.MimeTypeMap;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * 시안(A~G) 홈페이지를 그대로 감싸 보여주는 앱 셸.
 *
 * 시안 웹페이지를 서버에서 읽어오므로 홈페이지를 고치면 앱에서도 그대로 반영된다
 * (= UI/UX·기능 자동 업데이트). 앱 셸 자체의 갱신은 version.json 으로 안내한다.
 */
public class MainActivity extends Activity {

    /** 알림을 눌러 들어올 때 열어야 할 경로(시안 폴더 기준 상대경로 또는 전체 URL) */
    public static final String EXTRA_OPEN_PATH = "open_path";

    private WebView web;
    private TextView errorView;
    private boolean pendingReload;

    /** 첫 화면이 이 시간 안에 안 뜨면 '응답 없음'으로 보고 주소 변경 안내를 띄운다. */
    private static final long LOAD_TIMEOUT_MS = 15000;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final Runnable loadTimeout = () -> showError("15초 동안 응답이 없습니다");
    private boolean pageShown;
    private final List<String> jsErrors = new ArrayList<>();

    /** 웹페이지의 <input type="file"> 이 기다리는 선택 결과 */
    private ValueCallback<Uri[]> fileCallback;
    private static final int REQ_FILE = 2;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);

        web = new WebView(this);
        web.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));

        errorView = new TextView(this);
        errorView.setPadding(48, 48, 48, 48);
        errorView.setTextSize(15f);
        errorView.setBackgroundColor(0xFFFFF7ED);
        errorView.setVisibility(View.GONE);
        errorView.setOnClickListener(v -> promptBaseUrl());

        root.addView(errorView);
        root.addView(web);
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        // 변경된 화면이 즉시 보이도록 문서는 서버 확인을 우선한다.
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        // 영수증·증빙 첨부(<input type="file">)는 기본 WebChromeClient 로는 아무 반응이 없어 직접 연결한다.
        // PC 크롬 chrome://inspect 로 앱 화면을 점검할 수 있게 한다(내부 검토용 빌드).
        WebView.setWebContentsDebuggingEnabled(true);
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(android.webkit.ConsoleMessage m) {
                // 흰 화면 진단용: 스크립트 오류를 모아 두었다가 화면이 비면 보여 준다.
                if (m.messageLevel() == android.webkit.ConsoleMessage.MessageLevel.ERROR && jsErrors.size() < 5) {
                    String src = m.sourceId() == null ? "" : m.sourceId().replaceAll("^.*/", "");
                    jsErrors.add(m.message() + " (" + src + ":" + m.lineNumber() + ")");
                }
                return false;
            }

            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb,
                                             FileChooserParams params) {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }
                fileCallback = cb;
                try {
                    startActivityForResult(fileIntent(params), REQ_FILE);
                } catch (Exception e) {
                    fileCallback = null;
                    Toast.makeText(MainActivity.this, "파일을 고를 수 있는 앱이 없습니다.", Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }
        });
        // 시연용 영수증 이미지 저장(data: 링크)을 다운로드 폴더에 저장한다.
        web.setDownloadListener((url, ua, disposition, mime, length) -> saveDownload(url, disposition, mime));
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                String scheme = u.getScheme() == null ? "" : u.getScheme();
                // 외부 앱 연동(전화·지도·메일 등)은 시스템에 넘긴다.
                if (!scheme.startsWith("http")) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, u));
                        return true;
                    } catch (Exception e) {
                        return true;
                    }
                }
                return false;
            }

            @Override
            public void onPageStarted(WebView v, String url, android.graphics.Bitmap icon) {
                if (!pageShown) {
                    showLoading(url);
                }
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                // 연결 오류 뒤에도 onPageFinished 가 불린다. 여기서 무조건 숨기면
                // 오류 안내가 바로 사라져 빈 화면만 남는다(2026-10-08 실기기 증상).
                if (errorView.getTag() == null) {
                    pageShown = true;
                    ui.removeCallbacks(loadTimeout);
                    errorView.setVisibility(View.GONE);
                    ui.postDelayed(() -> checkBlank(v), 3000);
                }
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest req,
                                       android.webkit.WebResourceError err) {
                if (req.isForMainFrame()) {
                    showError("연결 오류: " + err.getDescription());
                }
            }

            @Override
            public void onReceivedHttpError(WebView v, WebResourceRequest req, WebResourceResponse res) {
                // 주소가 틀리면 서버의 404 화면이 떠서 원인을 알기 어렵다 → 안내로 바꾼다.
                if (req.isForMainFrame() && res.getStatusCode() >= 400) {
                    showError("서버 응답 " + res.getStatusCode() + " — 이 주소에 시안 화면이 없습니다");
                }
            }
        });

        Notices.ensureChannel(this);
        askNotificationPermission();
        NoticeJobService.schedule(this);

        String path = getIntent() == null ? null : getIntent().getStringExtra(EXTRA_OPEN_PATH);
        web.loadUrl(resolve(path));
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String path = intent == null ? null : intent.getStringExtra(EXTRA_OPEN_PATH);
        if (path != null && !path.isEmpty()) {
            web.loadUrl(resolve(path));
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        // 앱에 들어올 때마다 갱신 사항과 관리자 발송 건을 확인한다.
        checkUpdateAndNotices();
    }

    /** path 가 비면 시안 시작 페이지, 전체 URL이면 그대로, 상대경로면 서버 주소를 붙인다. */
    private String resolve(String path) {
        if (path == null || path.trim().isEmpty()) {
            return Prefs.startUrl(this);
        }
        String p = path.trim();
        if (p.startsWith("http://") || p.startsWith("https://")) {
            return p;
        }
        return Prefs.baseUrl(this) + (p.startsWith("/") ? p.substring(1) : p);
    }

    private void checkUpdateAndNotices() {
        new Thread(() -> {
            UpdateChecker.Result r = UpdateChecker.check(this);
            List<Notices.Item> items = Notices.fetchNew(this);
            runOnUiThread(() -> {
                if (r.reloadWeb) {
                    // 화면·기능이 바뀐 경우 캐시를 버리고 다시 읽는다.
                    web.clearCache(true);
                    web.reload();
                    Toast.makeText(this, "최신 화면으로 업데이트했습니다.", Toast.LENGTH_SHORT).show();
                }
                if (r.appUpdate) {
                    showUpdateDialog(r);
                }
                for (Notices.Item it : items) {
                    Notices.show(this, it);
                }
            });
        }).start();
    }

    private void showUpdateDialog(UpdateChecker.Result r) {
        AlertDialog.Builder b = new AlertDialog.Builder(this)
                .setTitle("업데이트 안내")
                .setMessage(r.message)
                .setCancelable(!r.force)
                .setPositiveButton("갱신", (d, w) -> {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(r.apkUrl)));
                    } catch (Exception e) {
                        Toast.makeText(this, "갱신 파일을 열 수 없습니다.", Toast.LENGTH_SHORT).show();
                    }
                    if (r.force) {
                        finish();
                    }
                });
        if (r.force) {
            // 필수 갱신은 미갱신 상태로 이용할 수 없게 한다.
            b.setNegativeButton("종료", (d, w) -> finish());
        } else {
            b.setNegativeButton("나중에", null);
        }
        b.show();
    }

    /** 다 읽었는데 화면에 글자가 하나도 없으면(흰 화면) 원인을 화면에 띄운다. */
    private void checkBlank(WebView v) {
        v.evaluateJavascript(
                "(function(){var b=document.body;return b?(b.innerText||'').trim().length+'|'+document.readyState+'|'+innerWidth+'x'+innerHeight:'nobody';})()",
                r -> {
                    String s = r == null ? "" : r.replace("\"", "");
                    if (s.startsWith("0|") || s.startsWith("nobody")) {
                        StringBuilder sb = new StringBuilder("화면 내용이 비어 있습니다 (앱 " + BuildConfig.VERSION_NAME + " · " + s + ")\n" + v.getUrl());
                        for (String e : jsErrors) sb.append("\n• ").append(e);
                        if (jsErrors.isEmpty()) sb.append("\n• 스크립트 오류 기록 없음");
                        sb.append("\n\n이 문구를 캡처해 담당자에게 보내 주세요. (눌러서 서버 주소 변경)");
                        errorView.setTag("error");
                        errorView.setText(sb.toString());
                        errorView.setVisibility(View.VISIBLE);
                    }
                });
    }

    /** 첫 화면을 기다리는 동안 빈 화면 대신 무엇을 여는 중인지 보여 준다. */
    private void showLoading(String url) {
        errorView.setTag(null);
        errorView.setText("시안 화면을 불러오는 중입니다… (앱 " + BuildConfig.VERSION_NAME + ")\n" + url
                + "\n\n오래 걸리면 이 문구를 눌러 서버 주소를 확인하세요.");
        errorView.setVisibility(View.VISIBLE);
        ui.removeCallbacks(loadTimeout);
        ui.postDelayed(loadTimeout, LOAD_TIMEOUT_MS);
    }

    private void showError(String why) {
        ui.removeCallbacks(loadTimeout);
        errorView.setTag("error");
        errorView.setText("시안 서버에 연결할 수 없습니다. (앱 " + BuildConfig.VERSION_NAME + ")\n(" + why + ")\n\n현재 주소: " + Prefs.baseUrl(this)
                + "\n\n이 문구를 눌러 서버 주소를 변경하세요.\n공개 주소: " + BuildConfig.DEFAULT_BASE_URL);
        errorView.setVisibility(View.VISIBLE);
    }

    /** 서버 주소를 앱에서 직접 바꿀 수 있게 한다(검토자 PC·LAN 주소가 매번 다르므로). */
    private void promptBaseUrl() {
        EditText et = new EditText(this);
        et.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        et.setText(Prefs.baseUrl(this));
        new AlertDialog.Builder(this)
                .setTitle("시안 서버 주소")
                .setMessage(BuildConfig.SITE_LABEL + "\n공개: " + BuildConfig.DEFAULT_BASE_URL
                        + "\n사내망 예) http://192.168.0.10:8080/")
                .setView(et)
                .setNeutralButton("공개 주소로", (d, w) -> {
                    Prefs.setBaseUrl(this, BuildConfig.DEFAULT_BASE_URL);
                    pageShown = false;
                    web.loadUrl(Prefs.startUrl(this));
                })
                .setPositiveButton("저장", (d, w) -> {
                    Prefs.setBaseUrl(this, et.getText().toString());
                    pendingReload = true;
                    pageShown = false;
                    web.loadUrl(Prefs.startUrl(this));
                })
                .setNegativeButton("취소", null)
                .show();
    }

    /** accept="image/*,.pdf" 처럼 확장자가 섞인 값도 MIME 으로 바꿔 파일 선택 창에 넘긴다. */
    private Intent fileIntent(WebChromeClient.FileChooserParams params) {
        List<String> mimes = new ArrayList<>();
        String[] accept = params == null ? null : params.getAcceptTypes();
        if (accept != null) {
            for (String raw : accept) {
                for (String a : raw.split(",")) {
                    String t = a.trim().toLowerCase();
                    if (t.isEmpty()) continue;
                    if (t.startsWith(".")) {
                        t = MimeTypeMap.getSingleton().getMimeTypeFromExtension(t.substring(1));
                        if (t == null) continue;
                    }
                    if (!mimes.contains(t)) mimes.add(t);
                }
            }
        }
        Intent i = new Intent(Intent.ACTION_GET_CONTENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        if (mimes.size() == 1) {
            i.setType(mimes.get(0));
        } else {
            i.setType("*/*");
            if (!mimes.isEmpty()) {
                i.putExtra(Intent.EXTRA_MIME_TYPES, mimes.toArray(new String[0]));
            }
        }
        if (params != null && params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE) {
            i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        }
        return Intent.createChooser(i, "파일 선택");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE) {
            if (fileCallback != null) {
                Uri[] picked = null;
                if (resultCode == RESULT_OK && data != null) {
                    if (data.getClipData() != null) {
                        int n = data.getClipData().getItemCount();
                        picked = new Uri[n];
                        for (int k = 0; k < n; k++) picked[k] = data.getClipData().getItemAt(k).getUri();
                    } else if (data.getData() != null) {
                        picked = new Uri[]{data.getData()};
                    }
                }
                // 취소해도 반드시 null 로 돌려줘야 다음 선택이 다시 열린다.
                fileCallback.onReceiveValue(picked);
                fileCallback = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    /** data: 링크는 직접 풀어 저장하고, 그 밖의 http 파일은 브라우저에 넘긴다. */
    private void saveDownload(String url, String disposition, String mime) {
        if (url == null) return;
        if (url.startsWith("data:")) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                Toast.makeText(this, "이 기기(Android 9 이하)에서는 앱 안 저장을 지원하지 않습니다.", Toast.LENGTH_LONG).show();
                return;
            }
            try {
                int comma = url.indexOf(',');
                String head = url.substring(5, comma);
                String type = head.split(";")[0];
                if (type.isEmpty()) type = "application/octet-stream";
                byte[] bytes = head.endsWith(";base64")
                        ? Base64.decode(url.substring(comma + 1), Base64.DEFAULT)
                        : Uri.decode(url.substring(comma + 1)).getBytes("UTF-8");
                String ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(type);
                String name = "dtid_" + System.currentTimeMillis() + (ext == null ? "" : "." + ext);
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                cv.put(MediaStore.MediaColumns.MIME_TYPE, type);
                cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                Uri out = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                try (OutputStream os = getContentResolver().openOutputStream(out)) {
                    os.write(bytes);
                }
                Toast.makeText(this, "다운로드 폴더에 저장했습니다: " + name, Toast.LENGTH_LONG).show();
            } catch (Exception e) {
                Toast.makeText(this, "파일을 저장하지 못했습니다.", Toast.LENGTH_SHORT).show();
            }
            return;
        }
        if (url.startsWith("blob:")) {
            Toast.makeText(this, "이 파일은 앱에서 내려받을 수 없습니다. PC 웹에서 받아 주세요.", Toast.LENGTH_LONG).show();
            return;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception e) {
            Toast.makeText(this, "파일을 열 수 없습니다: " + URLUtil.guessFileName(url, disposition, mime), Toast.LENGTH_SHORT).show();
        }
    }

    private void askNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
        }
    }

    /** 뒤로가기는 웹 히스토리를 먼저 따른다. 길게 누르면 서버 주소 설정. */
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && web.canGoBack()) {
            web.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public boolean onKeyLongPress(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            promptBaseUrl();
            return true;
        }
        return super.onKeyLongPress(keyCode, event);
    }
}
