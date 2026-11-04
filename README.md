# Panel Central · Prep Diplomacia Uy y Carolina Techera RRII

Panel de gestión que reúne las dos marcas en un solo lugar, organizado en workflows: correcciones de alumnos, agentes IA, agenda de Google Calendar, tareas, proyectos, marketing, contabilidad, métricas y contactos.

## Cómo abrirlo

- **En tu computadora:** abre `index.html` con doble clic.
- **En línea:** en GitHub, Settings › Pages › Deploy from a branch, con la carpeta raíz.

## Secciones

| Grupo | Sección | Qué permite |
|---|---|---|
| General | Inicio | “Requiere tu atención”, indicadores, workflows, agenda de Google, agentes del día y próximas tareas |
| General | Agenda | Google Calendar integrado (semana, mes o lista) y calendario interno de tareas, publicaciones e ítems de workflows |
| General | Tareas | Tablero o lista, recurrentes, envío a Google Calendar |
| Workflows | Workflows | Procesos por etapas: correcciones, carruseles, blog, materiales, captación, consultoría y los que crees |
| Workflows | Correcciones | Estado del agente diario, cantidades por clase, enlaces a la corrección en Moodle, checklist de acciones e historial |
| Workflows | Agentes IA | Los agentes programados en Claude, su horario, su último resultado y el workflow que alimentan |
| Negocio | Proyectos, Marketing, Contabilidad, Métricas, Contactos | Igual que antes, con el nuevo diseño |
| Sistema | Recursos, Ajustes | Enlaces, calendarios de Google, zona horaria, tipo de cambio y copia de seguridad |

## Correcciones de alumnos

1. Copia el informe diario del agente de correcciones (notificación de Claude o correo).
2. En **Correcciones**, pulsa **Pegar informe del agente**, luego **Analizar** y **Guardar y actualizar**.
3. El panel actualiza las cantidades por clase, el estado del agente, la lista de lo que tienes que hacer y el workflow. Los nombres de alumnos se omiten.

## Atajos

- `Ctrl K` o `/`: buscar en todo el panel o ejecutar un comando.
- `N`: crear algo nuevo.
- `Esc`: cerrar paneles.

## Modo servidor y tiempo real

Integrado en la web (ver `integracion/LEEME_DESARROLLADOR.md`), el panel funciona así:
- Se abre después de iniciar sesión.
- Guarda los datos en el servidor, sincronizados entre dispositivos.
- Recibe cada 30 segundos las novedades que envían los agentes de Claude (ver `integracion/AGENTES_CLAUDE.md`).

`servidor/server.mjs` es la implementación de referencia, probada de punta a punta, y también se puede publicar sola.

## Datos y privacidad

En modo local los datos se guardan en el navegador (localStorage); el repositorio solo contiene datos de ejemplo y cantidades agregadas. Descarga una copia de seguridad desde **Ajustes** con regularidad. Google Calendar se muestra si el navegador tiene la sesión de Google iniciada con la cuenta dueña de los calendarios.
