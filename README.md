# ¿Qué cocino hoy?

App de recetas para la casa (Medellín/Envigado): qué cocinar hoy, menú de la semana, lista de mercado por pasillos con botón de WhatsApp, menú imprimible para la nevera, "¿Qué tengo en casa?", lectura en voz alta de los pasos y modo opcional para bajar de peso.

- 38 recetas en `recetas.js`: 17 inspiradas en @hunt4shredz (adaptadas a ingredientes colombianos) y 21 clásicas colombianas. Cantidades para 4 porciones; la app las ajusta.
- Sin servidor ni cuentas: todo se guarda en el celular (localStorage). Funciona sin internet después de la primera vez (service worker).
- Para publicar cambios: editar, subir el número de `CACHE` en `sw.js` y hacer push. GitHub Pages sirve la rama `main`.
