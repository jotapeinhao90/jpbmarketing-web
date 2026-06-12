# Guardar leads del formulario en Google Sheets

El formulario de `/contacto` ya manda los leads por **email** (FormSubmit).
Estos pasos agregan una **copia automática en Google Sheets**. Son 4 pasos, una sola vez.

---

## Paso 1 — Crear la planilla

1. Entra a https://sheets.google.com y crea una **planilla nueva**.
2. Ponle nombre, por ejemplo: `Leads JPB Marketing`.
3. En la **fila 1**, escribe estos títulos (una columna cada uno):

   | A | B | C | D | E | F | G |
   |---|---|---|---|---|---|---|
   | Fecha | Nombre | Email | Empresa | Cargo | Servicio | Mensaje |

---

## Paso 2 — Pegar el script

1. En la planilla, menú **Extensiones → Apps Script**.
2. Borra todo lo que aparezca y pega **este código**:

```javascript
function doPost(e) {
  try {
    var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var p = e.parameter;
    hoja.appendRow([
      new Date(),
      p.nombre   || '',
      p.email    || '',
      p.empresa  || '',
      p.cargo    || '',
      p.servicio || '',
      p.mensaje  || ''
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. Guarda (ícono de disquete o `Ctrl/Cmd + S`).

---

## Paso 3 — Publicar como aplicación web

1. Arriba a la derecha: botón azul **Implementar → Nueva implementación**.
2. En el engranaje ⚙️ (tipo) elige **Aplicación web**.
3. Configura:
   - **Descripción:** `Formulario leads`
   - **Ejecutar como:** `Yo (tu correo)`
   - **Quién tiene acceso:** **Cualquier usuario** ← importante
4. Click **Implementar**.
5. Google te pedirá **autorizar** → acepta los permisos (es tu propia cuenta).
6. Copia la **URL de la aplicación web** (termina en `/exec`).

---

## Paso 4 — Pegar la URL en el sitio

Mándame esa URL y la dejo conectada, **o** hazlo tú:

1. Abre `contacto.html`.
2. Busca esta línea (cerca del final):

   ```javascript
   var SHEETS_URL = 'PEGAR_URL_DE_APPS_SCRIPT_AQUI';
   ```

3. Reemplaza `PEGAR_URL_DE_APPS_SCRIPT_AQUI` por tu URL `/exec`.
4. Guarda, commit y push.

---

## Listo ✅

Desde ese momento, cada persona que envíe el formulario:
- Te llega el **email** de siempre (FormSubmit), **y**
- Se agrega una **fila nueva** en tu Google Sheets con fecha y hora.

> Si alguna vez cambias el código del Apps Script, recuerda hacer
> **Implementar → Gestionar implementaciones → editar → Nueva versión**
> para que los cambios tomen efecto.
