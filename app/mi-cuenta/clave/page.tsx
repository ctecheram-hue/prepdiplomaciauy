import { requireUser } from "@/lib/auth";
import { PasswordForm } from "./PasswordForm";

export const metadata = { title: "Cambiar contraseña" };

export default async function Clave() {
  await requireUser("/mi-cuenta/clave");
  return (
    <div className="contenedor">
      <div className="caja caja-auth">
        <h1 style={{ fontSize: "1.6rem" }}>Nueva contraseña</h1>
        <hr className="filete" />
        <PasswordForm />
      </div>
    </div>
  );
}
