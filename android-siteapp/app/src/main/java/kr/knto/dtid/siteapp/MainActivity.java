package kr.knto.dtid.siteapp;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.text.InputType;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.util.List;

/**
 * 시안(A~F) 홈페이지를 그대로 감싸 보여주는 앱 셸.
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

        web.setWebChromeClient(new WebChromeClient());
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
            public void onPageFinished(WebView v, String url) {
                errorView.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest req,
                                       android.webkit.WebResourceError err) {
                if (req.isForMainFrame()) {
                    showError();
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

    private void showError() {
        errorView.setText("시안 서버에 연결할 수 없습니다.\n\n현재 주소: " + Prefs.baseUrl(this)
                + "\n\n이 문구를 눌러 서버 주소를 변경하세요.");
        errorView.setVisibility(View.VISIBLE);
    }

    /** 서버 주소를 앱에서 직접 바꿀 수 있게 한다(검토자 PC·LAN 주소가 매번 다르므로). */
    private void promptBaseUrl() {
        EditText et = new EditText(this);
        et.setInputType(InputType.TYPE_TEXT_VARIATION_URI);
        et.setText(Prefs.baseUrl(this));
        new AlertDialog.Builder(this)
                .setTitle("시안 서버 주소")
                .setMessage(BuildConfig.SITE_LABEL + " · 예) http://192.168.0.10:8080/")
                .setView(et)
                .setPositiveButton("저장", (d, w) -> {
                    Prefs.setBaseUrl(this, et.getText().toString());
                    pendingReload = true;
                    web.loadUrl(Prefs.startUrl(this));
                })
                .setNegativeButton("취소", null)
                .show();
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
