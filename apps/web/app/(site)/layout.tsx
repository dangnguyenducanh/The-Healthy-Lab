import { ActionBar } from "@/components/site/ActionBar";
import { Nav } from "@/components/site/Nav";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
      <ActionBar />
    </>
  );
}
