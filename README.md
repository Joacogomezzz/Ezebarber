# 💈 BarberPro - Sistema de Citas para Barbería

Una aplicación web profesional para gestionar citas en barbería con login persistente, disponibilidad de horarios y sincronización automática con Google Sheets.

## ✨ Características

- **Login Persistente**: Los usuarios quedan logueados en su dispositivo
- **Registro de Clientes**: Con nombre, apellido, teléfono y credenciales
- **Sistema de Citas**: Agendar con servicio, fecha y hora
- **Confirmación Automática**: Al agendar, la cita se confirma al instante
- **Horarios Bloqueados**: Al confirmar una cita, ese horario desaparece automáticamente
- **Google Sheets Integration**: Los datos se guardan automáticamente
- **Diseño Profesional**: Interfaz moderna y responsive

## 🚀 Cómo empezar

### 1. Abrir la aplicación
```bash
# Solo abre index.html en tu navegador
# O inicia un servidor local:
python -m http.server 8000
# Luego abre: http://localhost:8000
```

### 2. Configurar Google Sheets (IMPORTANTE)
Sigue los pasos en `CONFIGURAR_GOOGLE.md` para:
- Crear un Google Sheet
- Obtener Sheet ID
- Crear API Key en Google Cloud
- Actualizar `app.js` con tus datos

**⏱️ Tiempo:** ~10 minutos (es muy simple)

### 3. Credenciales de prueba

**Para Cliente:**
- Puedes crear una cuenta registrándote directamente en la app

**Para Barbero (acceso al panel):**
- Email: `barbero@barberia.com`
- Contraseña: `barbero123`

## 📱 Cómo acceder

### URL única:
- `http://localhost:8000`

### Para Clientes:
- Registro o ingreso
- Agendar nueva cita
- Ver mis citas confirmadas

### Flujo automático:
1. Cliente agenda una cita
2. Se confirma automáticamente
3. Ese horario se bloquea (no aparece más disponible)
4. Los datos se envían a Google Sheets

## 🔒 Seguridad

- Las contraseñas se guardan en localStorage (para desarrollo)
- Para producción, implementar un backend con hashing
- Las citas se guardan localmente y en Google Sheets

## 📝 Datos guardados

En Google Sheets se registran:
- Nombre y apellido del cliente
- Teléfono y email
- Servicio solicitado
- Fecha y hora de la cita
- Notas adicionales
- Fecha de registro

## 🎨 Personalización

Puedes cambiar:
- Colores en `styles.css`
- Servicios disponibles en `index.html`
- Horarios predeterminados en `app.js`
- Nombre de la barbería en `index.html`

## ⚙️ Archivos

- `index.html` - Estructura HTML
- `styles.css` - Estilos y responsive design
- `app.js` - Lógica de la aplicación
- `GOOGLE_SHEETS_SETUP.md` - Guía de configuración de Google Sheets

---

**¡Listo para usar! Cualquier duda, revisa GOOGLE_SHEETS_SETUP.md**
