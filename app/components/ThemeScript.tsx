import { THEME_SCRIPT } from "../lib/theme";

/** Blocking head script that resolves the theme before first paint. */
export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
