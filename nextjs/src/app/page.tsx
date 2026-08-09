import HomeShell from "@/components/HomeShell";
import { getInitialGallery } from "@/lib/getInitialDrawings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialGallery = await getInitialGallery();
  return <HomeShell initialGallery={initialGallery} />;
}
