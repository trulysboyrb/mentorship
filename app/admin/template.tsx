// A template (unlike a layout) is created fresh on every page change, so each admin page fades in.
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="anim-page">{children}</div>;
}
