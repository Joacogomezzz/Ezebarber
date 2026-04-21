# Conectar directamente a Google Sheets

Esta es la forma **más simple** de conectar BarberPro a Google Sheets sin necesidad de Google Apps Script.

## Paso 1: Crear Google Sheet

1. Ve a [sheets.google.com](https://sheets.google.com)
2. Crea una nueva hoja de cálculo
3. Renómbrala a "Barbería - Citas"
4. En la pestaña inferior, renombra la hoja a **"Citas"** (importante)
5. En la primera fila, agrega estos títulos:
   - A1: `Nombre`
   - B1: `Apellido`
   - C1: `Teléfono`
   - D1: `Email`
   - E1: `Servicio`
   - F1: `Fecha`
   - G1: `Hora`
   - H1: `Notas`
   - I1: `Estado`
   - J1: `Fecha Registro`

## Paso 2: Obtener el Sheet ID

1. Abre tu Google Sheet
2. En la URL verás algo como:
   ```
   https://docs.google.com/spreadsheets/d/1A2B3C4D5E6F7G8H9I0J/edit
   ```
3. Copia la parte entre `/d/` y `/edit`:
   ```
   1A2B3C4D5E6F7G8H9I0J
   ```
   **Ese es tu SHEET_ID**

## Paso 3: Crear API Key en Google Cloud

1. Ve a [console.cloud.google.com](https://console.cloud.google.com)
2. Crea un nuevo proyecto (o usa uno existente)
3. Habilita la **Google Sheets API**:
   - Ve a "APIs y servicios" → "Biblioteca"
   - Busca "Google Sheets API"
   - Haz clic en ella
   - Haz clic en "Habilitar"
4. Crea una clave de API:
   - Ve a "APIs y servicios" → "Credenciales"
   - Haz clic en "Crear credenciales"
   - Selecciona "Clave de API"
   - Copia la clave que aparece

## Paso 4: Dar permisos al Sheet

1. Abre tu Google Sheet
2. Haz clic en "Compartir" (esquina superior derecha)
3. En "Cambiar la configuración de privacidad", selecciona **"Cualquiera que tenga el enlace"**
4. Haz clic en "Copiar enlace"

## Paso 5: Actualizar app.js

Abre el archivo `app.js` y reemplaza estas líneas:

```javascript
const SHEET_ID = 'TU_SHEET_ID_AQUI';
const API_KEY = 'TU_API_KEY_AQUI';
```

Con tus valores reales:

```javascript
const SHEET_ID = '1A2B3C4D5E6F7G8H9I0J';
const API_KEY = 'AIzaSyD_tu_clave_api_aqui';
```

## ¡Listo!

Recarga la página y prueba agendar una cita. Debería guardarse automáticamente en tu Google Sheet.

---

### ❓ Solución de problemas

**"Error de CORS" o "No tienes permiso":**
- Verifica que el Sheet está compartido con "Cualquiera con el enlace"
- Verifica que la API Key sea correcta

**"Las citas no aparecen en el Sheet":**
- Verifica que el nombre de la pestaña es exactamente "Citas"
- Verifica que los encabezados (A1:J1) están correctos

**"Error en Google Cloud Console":**
- Asegúrate de que la Google Sheets API está habilitada
- Verifica que tienes una clave de API (no OAuth)
