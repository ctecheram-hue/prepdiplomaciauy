# Conectar los agentes de Claude al Panel Central

Cada agente programado envía al panel lo que hizo al terminar su corrida. El panel consulta las novedades cada 30 segundos (y cada vez que vuelves a la pestaña) y las muestra en **Actividad reciente**, en Correcciones, en Agentes IA y en los workflows.

## Requisitos (una sola vez)

1. **Que el panel esté en la web**, con los endpoints de `LEEME_DESARROLLADOR.md` funcionando.
2. **El token de los agentes como secreto del entorno de Claude**, con el nombre `PANEL_TOKEN`. Se carga en claude.ai/code, en la configuración del entorno. Nunca se escribe dentro del texto de un agente.
3. **Permitir el acceso de red de ese entorno al dominio del panel**, por ejemplo `www.prepdiplomacia.com`.

## Bloque para agregar al final de cada agente

```
=== PASO FINAL. Informar al Panel Central ===
Al terminar (también si terminas con falla), envía al panel un resumen con este comando, adaptando el JSON:

curl -sS -X POST "https://www.prepdiplomacia.com/api/panel/events" \
  -H "Authorization: Bearer $PANEL_TOKEN" -H "Content-Type: application/json" \
  -d '<JSON>'

Si el envío falla, menciónalo en tu respuesta final y sigue; nunca reintentes más de dos veces.
Nunca incluyas nombres, correos ni datos personales de alumnos en lo que envías.
```

## JSON según el agente

**Correcciones diarias Moodle**: dos novedades en un arreglo.

```json
[
  {"type":"agente.corrida","source":"Correcciones diarias Moodle",
   "payload":{"agente":"Correcciones diarias Moodle","fecha":"AAAA-MM-DD","estado":"ok|aviso|falla","nota":"Una frase con lo principal"}},
  {"type":"correcciones.informe","source":"Correcciones diarias Moodle",
   "payload":{"fecha":"AAAA-MM-DD","hora":"HH:MM","estado":"ok|aviso|falla","resumen":"Dos frases",
     "clases":{"C03":{"nueva":0,"descargada":0,"revision":16,"devuelta":3,"problema":0},"C03-T3":{"revision":0}},
     "problemas":["Clase 05: falta el Tema 3 (sin nombre del alumno)"],
     "acciones":["Abrir Chrome","Iniciar sesión en Moodle"]}}
]
```

Las claves de clase son `C02`, `C03`, `C04` y así sucesivamente. La Tarea 3 de la Clase 03 es `C03-T3`. Los estados posibles por clase son:

- `nueva`: entregada en Moodle sin descargar;
- `descargada`: descargada sin corregir;
- `revision`: corregida, pendiente de la revisión de Carolina;
- `devuelta`: subida a Moodle;
- `problema`: entrega con problema.

**Carrusel del día (cualquiera de las dos cuentas)**: las tres noticias propuestas como un ítem del workflow.

```json
{"type":"workflow.item","source":"Carrusel del día · Prep Diplomacia Uy",
 "payload":{"workflow":"Carrusel de noticia","etapa":"Propuesta del agente","clave":"carrusel-pd-AAAA-MM-DD",
   "titulo":"Tres noticias: <tema 1>, <tema 2>, <tema 3>","marca":"pd","responsable":"Agente IA","fecha":"AAAA-MM-DD",
   "notas":"1. ... 2. ... 3. ..."}}
```

Para la cuenta personal se usa `"marca":"ct"`. Cuando avances el carrusel (noticia elegida, Canva, publicado), reenvía el mismo `clave` con la nueva `etapa` y el ítem se mueve solo.

**Artículo Panorama internacional**

```json
{"type":"workflow.item","source":"Artículo diario · Panorama internacional",
 "payload":{"workflow":"Artículo Panorama internacional","etapa":"Temas propuestos","clave":"blog-AAAA-MM-DD",
   "titulo":"Temas del día: <recomendado>","responsable":"Agente IA","fecha":"AAAA-MM-DD","enlace":"<URL del documento si existe>"}}
```

Los demás agentes envían solo `agente.corrida`.

## Otras novedades disponibles

| Tipo | Campos de `payload` |
|---|---|
| `tarea.nueva` | `titulo`, `fecha`, `hora`, `prioridad` (alta, media o baja), `marca` (pd o ct), `notas`, `clave` |
| `metrica` | `metrica` (ig_seguidores, li_seguidores, web_visitas, news_suscriptores, alumnos, consultas, conversion, clientes), `valor`, `fecha`, `marca` |
| `movimiento` | `tipo` (ingreso o gasto), `fecha`, `concepto`, `importe`, `moneda` (UYU, USD o EUR), `categoria`, `estado` (cobrado o pendiente), `marca` |
| `publicacion` | `titulo`, `canal`, `formato`, `estado` (idea, produccion, programada o publicada), `fecha`, `enlace`, `alcance`, `interacciones`, `guardados`, `clave` |
| `nota` | `texto`, `nivel` (info, ok, ia o bad) |

Esto también sirve en una conversación normal con Claude. Por ejemplo, puedes pedir: "registra en el panel un ingreso de 600 dólares por la consultoría".
