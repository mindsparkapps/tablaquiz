# TablaQuiz

Quizzes para aprender la tabla periódica. Funciona sola (PWA) y como **plugin de ZenBan**.

## Qué tiene

- **Tabla**: los 118 elementos por categoría (filtro en la leyenda). Al tocar uno se ve su ficha: número, masa, periodo, grupo y tu acierto.
- **Jugar** (7 modos, 10, 20 o sin fin de preguntas, con rango de elementos: 10, 20, 36, 54, 86 o 118):
  - Símbolo → nombre, Nombre → símbolo, Número → elemento, Elemento → número
  - Ubícalo en la tabla (tocas el casillero)
  - Escribe el nombre (acepta tildes/mayúsculas distintas, un error de tipeo y variantes como cinc/zinc)
  - ¿Qué tipo es? (alcalino, halógeno, noble…)
- Las preguntas se eligen con más peso para los elementos que fallas o que no has visto. Al terminar, **Repasar mis fallos**.
- **Progreso**: mapa de dominio de la tabla, los que más cuestan, mejores marcas, sonido y reinicio.

## Plugin de ZenBan

1. En ZenBan: ⚙️ Configuración › Plugins › pega la URL donde publiques la app › Agregar.
2. Botón derecho en el lienzo › Agregar aquí › TablaQuiz.

Dentro de ZenBan el progreso se guarda **dentro del objeto** (cada objeto tiene el suyo) y se sincroniza con el Drive de ZenBan. En un tablero de solo lectura se puede jugar, pero no se guarda. Fuera de ZenBan se guarda en `localStorage`.

## Estructura

```
index.html / styles.css / app.js   interfaz y juegos
elements.js                        datos de los 118 elementos (categoría y posición se calculan)
zenban-plugin.json / zenban-plugin-sdk.js   plugin de ZenBan
manifest.json / sw.js / icons/     app instalable y modo sin conexión
```

Al publicar cambios, sube `APP_VERSION` en `app.js`, los `?v=` de `index.html` y `sw.js`, y `CACHE_NAME` en `sw.js`.
