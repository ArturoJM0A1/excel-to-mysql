# Excel a MySQL - Convertidor

Aplicación web que convierte archivos Microsoft Excel (`.xlsx` y `.xls`) en un script SQL compatible con MySQL. Todo el procesamiento ocurre del lado del cliente, sin necesidad de servidor ni backend.

## Objetivo

Permitir al usuario cargar uno o varios archivos Excel y generar un archivo `.sql` listo para importar en MySQL, con detección automática de hojas, inferencia de tipos de datos, sanitización de nombres y manejo robusto de valores nulos, fechas, booleanos y caracteres especiales.

## Tecnologías

- **React 18** — biblioteca de interfaz de usuario
- **Vite 6** — empaquetador y servidor de desarrollo
- **SheetJS (xlsx)** — lectura de archivos Excel
- **CSS plano** — estilos responsivos sin frameworks externos

## Requisitos previos

- [Node.js](https://nodejs.org/) >= 18
- npm (incluido con Node.js)

## Instalación

```bash
cd excel-to-mysql
npm install
```

## Ejecución en modo desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en el navegador.

## Generación de la versión de producción

```bash
npm run build
```

El resultado se genera en el directorio `dist/` y puede servirse con cualquier servidor estático.

Para previsualizar la versión de producción localmente:

```bash
npm run preview
```

## Estructura del proyecto

```
excel-to-mysql/
├── index.html                  # Punto de entrada HTML (minimal)
├── package.json                # Dependencias y scripts
├── vite.config.js              # Configuración de Vite
├── vercel.json                 # Configuración para despliegue en Vercel
├── README.md
└── src/
    ├── main.jsx                # Montaje de React en el DOM
    ├── App.jsx                 # Componente raíz, orquestación general
    ├── components/
    │   ├── FileUpload.jsx      # Carga de archivos (selector + drag & drop)
    │   ├── StatsPanel.jsx      # Contadores de archivos, hojas, tablas, registros
    │   ├── ActionsPanel.jsx    # Botones Convertir/Descargar y opciones
    │   ├── ProgressBar.jsx     # Indicador de progreso de conversión
    │   ├── Console.jsx         # Consola de mensajes con auto-scroll
    │   └── ErrorToast.jsx      # Notificación flotante de errores
    ├── hooks/
    │   └── useConverter.js     # Hook: lógica completa de conversión
    ├── utils/
    │   ├── constants.js        # Palabras reservadas MySQL, constantes
    │   ├── sanitizers.js       # Sanitización de nombres (tablas/columnas)
    │   ├── typeInference.js    # Inferencia de tipos MySQL por columna
    │   ├── excelReader.js      # Lectura de Excel con FileReader + SheetJS
    │   ├── formatters.js       # Escapado SQL, detección booleanos/números, formato fechas
    │   └── sqlGenerator.js     # Generación de sentencias DROP, CREATE, INSERT
    └── styles/
        └── app.css             # Estilos completos de la aplicación
```

## Componentes principales

| Componente | Tipo | Responsabilidad |
|---|---|---|
| `App` | Contenedor | Orquesta todos los componentes, mantiene estado de opciones locales |
| `FileUpload` | Presentacional + lógica mínima | Maneja eventos de drag & drop y selector nativo de archivos |
| `StatsPanel` | Presentacional | Muestra contadores: archivos, hojas detectadas, tablas generadas, registros |
| `ActionsPanel` | Presentacional | Botones Convertir/Descargar, checkboxes de opciones, nombre de archivo |
| `ProgressBar` | Presentacional | Barra de progreso con porcentaje y detalle textual |
| `Console` | Presentacional | Lista de mensajes con auto-scroll mediante `useRef` + `useEffect` |
| `ErrorToast` | Presentacional | Notificación flotante con auto-cierre programado vía `useEffect` |
| `useConverter` | Hook | Centraliza todo el estado de la conversión y las funciones de negocio |

## Flujo general de funcionamiento

1. **Carga de archivos:** El usuario selecciona o arrastra archivos Excel. `FileUpload` notifica a `App` mediante `onAddFiles`, que actualiza el estado en `useConverter`.

2. **Conversión:** Al hacer clic en "Convertir", `useConverter.convert()` ejecuta el pipeline:

   a. **Lectura** (`readWorkbook`): Cada archivo se lee con `FileReader` en `ArrayBuffer` y se parsea con SheetJS.

   b. **Procesamiento por hoja** (`processSheetData`): Cada hoja se convierte en un objeto tabla con columnas sanitizadas, tipos inferidos y filas filtradas.

   c. **Generación SQL** (`buildSQL`): Se construyen sentencias `CREATE TABLE` e `INSERT INTO` con batch de 500 filas por sentencia.

3. **Progreso:** Durante todo el proceso, `useConverter` actualiza `progress` y agrega entradas a `logs`, lo que provoca re-renderizaciones de `ProgressBar` y `Console`.

4. **Descarga:** Al hacer clic en "Descargar SQL", `useConverter.downloadSQL()` crea un `Blob` con el script y dispara la descarga mediante un enlace temporal.

## Dependencias

### Producción

| Paquete | Versión | Propósito |
|---|---|---|
| `react` | ^18.3.1 | Biblioteca principal de React |
| `react-dom` | ^18.3.1 | Renderizado en el DOM |
| `xlsx` | ^0.18.5 | Lectura de archivos Excel (SheetJS) |

### Desarrollo

| Paquete | Versión | Propósito |
|---|---|---|
| `vite` | ^6.0.0 | Empaquetador y servidor de desarrollo |
| `@vitejs/plugin-react` | ^4.3.4 | Plugin de React para Vite |

## Compatibilidad

- Chrome 90+
- Edge 90+
- Firefox 90+
- Opera 76+
- Safari 15+

La aplicación funciona completamente del lado del cliente. No requiere servidor, API ni funciones serverless.

## Despliegue en Vercel

El proyecto está configurado para desplegarse directamente en Vercel como sitio estático.

1. Conecta el repositorio a [Vercel](https://vercel.com).
2. Vercel detectará automáticamente la configuración `vercel.json`:
   - Framework: Vite
   - Comando de build: `npm run build`
   - Directorio de salida: `dist`

Alternativamente, despliega con la CLI de Vercel:

```bash
npm i -g vercel
vercel --prod
```

## Posibles mejoras futuras

- Vista previa del SQL generado antes de descargar
- Selección individual de hojas a incluir en la exportación
- Soporte para otros motores de base de datos (PostgreSQL, SQLite)
- Personalización de tipos de columna por el usuario
- Modo oscuro
- Internacionalización (i18n)
- Pruebas unitarias con Vitest
- Procesamiento en Web Worker para archivos extremadamente grandes
