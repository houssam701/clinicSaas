import { redirectToRoleHome } from "@/services/page-guard";

export default async function Home() {
  await redirectToRoleHome();
}
