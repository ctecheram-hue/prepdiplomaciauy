# Panel Central · Prep Diplomacia Uy y Carolina Techera RRII

Panel de gestión que reúne en un solo lugar las dos marcas: tareas, calendario, proyectos, marketing y publicaciones, contabilidad, métricas, contactos y recursos.

## Cómo abrirlo

- **En tu computadora:** descarga el repositorio y abre `index.html` con doble clic en el navegador.
- **En línea (recomendado):** en GitHub, Settings › Pages › Deploy from a branch, elige la rama y la carpeta raíz. El panel queda disponible en una dirección propia.

## Módulos

| Módulo | Qué permite |
|---|---|
| Inicio | Resumen del día: tareas abiertas y vencidas, publicaciones programadas, resultado del mes, alumnos activos, agenda de 7 días, avance de proyectos y seguimientos |
| Calendario | Vista mensual de tareas, publicaciones y cierres de proyecto, con proyección de las tareas recurrentes; clic en un día para crear una tarea |
| Tareas | Tablero (arrastrar y soltar) o lista; filtros por vencidas, hoy, semana y recurrentes; repeticiones semanales, quincenales o mensuales |
| Proyectos | Fichas con avance automático según tareas, ingresos, gastos, presupuesto y contactos asociados |
| Marketing y publicaciones | Flujo editorial (idea, producción, programada, publicada) y resultados por pieza: alcance, interacciones, guardados |
| Contabilidad | Ingresos y gastos en pesos o dólares, consolidado en pesos, gráficos de 12 meses, categorías, pendientes de cobro y exportación CSV |
| Métricas | Seguidores, visitas web, suscriptores, alumnos, consultas y conversión, con evolución en el tiempo |
| Contactos | Alumnos, interesados, clientes y aliados con fecha de próximo seguimiento |
| Recursos | Enlaces a la web, Moodle, autoevaluaciones, redes y correos |
| Ajustes | Tipo de cambio, copia de seguridad (descargar y restaurar), limpieza de datos de ejemplo |

El selector superior filtra todo el panel por marca. El buscador (atajo: tecla `/`) busca en todos los módulos.

## Datos

Los datos se guardan en el navegador (localStorage). Conviene descargar una copia de seguridad con regularidad desde **Ajustes** y restaurarla para pasar los datos a otro equipo. Los registros marcados “ejemplo” son ficticios y se eliminan con un clic.

## Estructura

```
index.html          Estructura de la página
assets/styles.css   Estilos con la paleta de marca
assets/app.js       Lógica de la aplicación (sin dependencias)
```
