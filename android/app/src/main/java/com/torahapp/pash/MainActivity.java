package com.torahapp.pash;

import android.os.Bundle;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Keep a native safe-area fallback for Android WebView edge-to-edge devices.
 * We inject standard Capacitor CSS vars (--safe-area-inset-*) to ensure
 * stable layout even when env(safe-area-inset-*) is not reliable.
 */
public class MainActivity extends BridgeActivity {

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);

		ViewCompat.setOnApplyWindowInsetsListener(getBridge().getWebView(), (view, insets) -> {
			Insets bars = insets.getInsets(
				WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
			);

			float density = getResources().getDisplayMetrics().density;
			float top = bars.top / density;
			float bottom = bars.bottom / density;
			float left = bars.left / density;
			float right = bars.right / density;

			injectSafeArea(top, bottom, left, right);
			return insets;
		});
	}

	@Override
	public void onResume() {
		super.onResume();
		getBridge().getWebView().requestApplyInsets();
	}

	private void injectSafeArea(float top, float bottom, float left, float right) {
		String js = "(function applyInsets(){" +
			"var root=document.documentElement;" +
			"if(!root){setTimeout(applyInsets,50);return;}" +
			"var r=root.style;" +
			"r.setProperty('--safe-area-inset-top','" + top + "px');" +
			"r.setProperty('--safe-area-inset-bottom','" + bottom + "px');" +
			"r.setProperty('--safe-area-inset-left','" + left + "px');" +
			"r.setProperty('--safe-area-inset-right','" + right + "px');" +
			"window.dispatchEvent(new CustomEvent('safeAreaUpdated',{detail:{top:" + top + ",bottom:" + bottom + "}}));" +
			"})();";

		getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(js, null));
	}
}


