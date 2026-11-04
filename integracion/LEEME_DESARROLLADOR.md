# Panel Central · Guía de integración para el desarrollador

**Objetivo:** que Carolina abra el Panel Central dentro de www.prepdiplomacia.com, después de iniciar sesión con su usuario de administración, con los datos guardados en el servidor y actualizados por sus agentes de Claude.

El panel es un frontend estático (`index.html` y `assets/`) sin dependencias. Para pasarlo al modo servidor, el sitio tiene que hacer **dos cosas**:
1. Servir la página protegida por el rol de administración.
2. Exponer **cuatro endpoints** que guardan datos JSON.

En `servidor/server.mjs` hay una implementación de referencia completa y probada (Node 18, sin dependencias). Sirve como especificación ejecutable y también como alternativa independiente (ver el final).

## 1. Página del panel

- **Ruta sugerida:** `/admin/panel` (o la que prefieras), accesible solo para el rol de administración. Sin sesión, redirige a `/cuenta/login?ReturnUrl=...`.
- **Contenido:** el `index.html` de este repositorio, con los archivos de `assets/`, y esta línea agregada **antes** de `<script src="assets/app.js">`:

```html
<script>window.PANEL_CONFIG = { apiBase: '/api/panel', loginUrl: '/cuenta/login', user: 'Carolina', logoutUrl: '/cuenta/logout' };</script>
```

Si `PANEL_CONFIG.apiBase` no existe, el panel guarda los datos en el navegador (modo local). Con `apiBase` usa los endpoints de abajo. Todas las llamadas son del mismo origen y envían la cookie de sesión (`credentials: 'include'`).

## 2. Endpoints (bajo `apiBase`)

| Método y ruta | Autorización | Respuesta |
|---|---|---|
| `GET /state` | Sesión de administración | `200 { "rev": 3, "data": { … } }`. Sin datos todavía: `200 { "rev": 0, "data": null }` |
| `GET /state?since=3` | Sesión de administración | `204` si `rev` actual ≤ 3; si no, igual que arriba |
| `PUT /state` con cuerpo `{ "rev": 3, "data": { … } }` | Sesión de administración | Si `rev` coincide con el guardado: guarda con `rev + 1` y responde `200 { "rev": 4 }`. Si no coincide: `409 { "rev": <actual>, "data": <actual> }` |
| `GET /events?after=12` | Sesión de administración | `200 [ { "id": 13, "type": "...", "payload": { … }, "source": "...", "createdAt": "ISO" }, … ]` en orden ascendente (máximo 200) |
| `POST /events` con cuerpo `{ type, payload, source }` o un arreglo de hasta 50 | Sesión de administración **o** `Authorization: Bearer <AGENT_TOKEN>` | `201 { "ok": true, "ids": [13, 14] }` |

Además:
- **Sin sesión o con token inválido:** `401`. El panel redirige a `loginUrl` ante `401` y `403`.
- **Tipos de novedad válidos:** `correcciones.informe`, `agente.corrida`, `workflow.item`, `tarea.nueva`, `metrica`, `movimiento`, `publicacion` y `nota`. Cualquier otro tipo responde `400`.
- **Límites sugeridos:** 2 MB por cuerpo, 1.000 eventos conservados.

El servidor no interpreta `data` ni `payload`: guarda y devuelve JSON. El panel aplica las novedades y registra en `data.meta.lastEventId` hasta dónde las procesó.

### Tablas sugeridas (SQL Server o Azure SQL)

```sql
CREATE TABLE PanelState (
  Id INT PRIMARY KEY CHECK (Id = 1),
  Rev INT NOT NULL,
  Data NVARCHAR(MAX) NOT NULL,
  UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE PanelEvents (
  Id BIGINT IDENTITY(1,1) PRIMARY KEY,
  Type NVARCHAR(40) NOT NULL,
  Payload NVARCHAR(MAX) NOT NULL,
  Source NVARCHAR(120) NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
```

**Control de versión en el `PUT`:** `UPDATE PanelState SET Rev = Rev + 1, Data = @data, UpdatedAt = SYSUTCDATETIME() WHERE Id = 1 AND Rev = @rev`. Si afecta 0 filas, responde `409` con el estado actual. La primera vez (no hay fila y `rev = 0`), `INSERT` con `Rev = 1`.

## 3. Token de los agentes

- Genera un token largo y aleatorio, por ejemplo con `openssl rand -hex 32`, y guárdalo como configuración de la aplicación en Azure (`PANEL_AGENT_TOKEN`).
- Ese token solo permite `POST /events`: nunca lee datos.
- Pásale el token a Carolina **por un canal privado**. Ella lo carga como secreto en su entorno de Claude (ver `AGENTES_CLAUDE.md`).

## 4. Seguridad

- `GET` y `PUT /state` y `GET /events` exigen el rol de administración. Contienen datos financieros y de alumnos.
- **Cabeceras sugeridas para la página del panel:** `X-Frame-Options: SAMEORIGIN`, `Cache-Control: no-store` y `X-Robots-Tag: noindex`.
- El panel solo inserta en la página contenido escapado.
- Conviene un respaldo diario de `PanelState`. La referencia guarda una copia por día.

## 5. Alternativa sin tocar el sitio

Si integrarlo en el sitio lleva tiempo, `servidor/server.mjs` se puede publicar tal cual como otra App Service de Node en Azure, por ejemplo en `panel.prepdiplomacia.com`, con su propio inicio de sesión por contraseña:

1. Crea la App Service con Node 20 en Linux y despliega este repositorio. Comando de inicio: `node servidor/server.mjs`.
2. En Configuration, define las variables de entorno:
   - `PANEL_PASSWORD`
   - `SESSION_SECRET` (aleatorio, 64 caracteres)
   - `AGENT_TOKEN`
   - `DATA_DIR=/home/datos-panel` (carpeta persistente de App Service)
   - `PANEL_USER=Carolina`
3. Asigna el dominio personalizado y el certificado administrado.
4. El panel queda en `https://panel.prepdiplomacia.com/panel/`.

Para probarla en tu computadora:

```bash
PANEL_PASSWORD=clave SESSION_SECRET=$(openssl rand -hex 32) AGENT_TOKEN=token node servidor/server.mjs
```

Después abre http://localhost:8080/panel/.
