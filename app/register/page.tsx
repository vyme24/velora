import { redirect } from "next/navigation";

export default function RegisterPage() {
  redirect("/?auth=1&auth_mode=join");
}

