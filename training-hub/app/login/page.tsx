import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-md content-center px-4">
      <p className="kicker">Adaptive Fitness</p>
      <h1 className="mt-2 text-3xl">Training Hub</h1>
      <p className="muted mt-2 mb-6">Canonical program, exports, and Intervals.icu sync.</p>
      <LoginForm />
    </main>
  );
}
