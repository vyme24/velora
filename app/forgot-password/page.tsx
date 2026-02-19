import { redirect } from "next/navigation";

export default function ForgotPasswordPage() {
  redirect("/?auth=1&auth_mode=login&auth_forgot=1");
}

