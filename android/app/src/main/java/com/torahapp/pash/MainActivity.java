package com.torahapp.pash;

import android.os.Bundle;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Modern API (Android 11+ / API 30+): read real window insets via
        // ViewCompat.setOnApplyWindowInsetsListener instead of the internal
        // "status_bar_height" / "navigation_bar_height" resource hack which
        // is unreliable on Android 11+ and broken on Android 15 edge-to-edge.
        ViewCompat.setOnApplyWindowInsetsListener(getBridge().getWebView(), (view, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            float density = getResources().getDisplayMetrics().density;
            float saiTop    = bars.top    / density;
            float saiBottom = bars.bottom / density;
            injectInsets(saiTop, saiBottom);
            // Return insets unconsumed so Capacitor can still handle them.
            return insets;
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        // Re-request insets in case they changed while paused (e.g. keyboard dismissed).
        getBridge().getWebView().requestApplyInsets();
    }

    /** Injects --sai-top / --sai-bottom CSS custom properties into the WebView. */
    private void injectInsets(float topDp, float bottomDp) {
        String js = "(function(){" +
            "var r=document.documentElement.style;" +
            "r.setProperty('--sai-top','"    + topDp    + "px');" +
            "r.setProperty('--sai-bottom','" + bottomDp + "px');" +
            "})();";
        getBridge().getWebView().post(() ->
            getBridge().getWebView().evaluateJavascript(js, null)
        );
    }
}


