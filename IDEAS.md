# Registro de Ideas y Desarrollo de Producto — Lumen POS

Este documento consolida las ideas de arquitectura, experiencia de usuario (UX), hardware y lógica de negocio planteadas para el crecimiento de **Lumen POS**, junto con su respectivo análisis técnico y plan de desarrollo.

---

## Idea 1: Impresión Térmica Silenciosa Directa («Lumen Print Agent / Hardware Bridge»)

### 1.1. Planteamiento del Problema
Actualmente, el sistema web utiliza `window.print()` del navegador para imprimir comprobantes de venta, reportes de turno (Corte X/Z) y etiquetas de código de barras. Esto genera fricción operativa en el mostrador:
* **Interrupción del flujo:** Cada venta congela la interfaz y abre la ventana modal de diálogo del navegador exigiendo interacción del cajero (2 o 3 clics obligatorios).
* **Falta de control de hardware:** Una página web no puede emitir pulsos eléctricos por puerto RJ11 para abrir la gaveta de dinero automáticamente, ni enviar el comando de corte de papel a guillotina (`GS V 66 0`).
* **Lentitud gráfica:** El navegador rasteriza el ticket como página web en lugar de imprimir texto plano en microsegundos vía comandos nativos ESC/POS.

---

### 1.2. Solución Propuesta: Agente Local de Impresión
Crear un microservicio de escritorio liviano (**«Lumen Print Agent»**) que se instale una sola vez en la computadora del mostrador y corra en segundo plano (System Tray / Servicio de sistema).

```
┌────────────────────────────────┐        HTTP POST (JSON)        ┌───────────────────────────────────┐
│     Lumen POS (Navegador)      │  ────────────────────────────► │    Lumen Print Agent (Localhost)  │
│  Al cobrar o pulsar Imprimir   │   http://127.0.0.1:18080/print │   • Escucha en puerto local       │
└────────────────────────────────┘                                │   • Traduce a comandos ESC/POS    │
                                                                  └─────────────────┬─────────────────┘
                                                                                    │
                                                                                    │ Raw Bytes (USB / COM / Spooler)
                                                                                    ▼
                                                                  ┌───────────────────────────────────┐
                                                                  │     Impresora Térmica + Gaveta    │
                                                                  │   1. Impresión en ~30 ms          │
                                                                  │   2. Apertura de gaveta (RJ11)    │
                                                                  │   3. Corte de papel automático    │
                                                                  └───────────────────────────────────┘
```

---

### 1.3. Desarrollo y Especificación Técnica

#### 1. Tecnología del Agente (Ejecutable de escritorio)
* **Opción A (Go / Golang) — Recomendada:**
  - Compila en un único archivo binario `.exe` independiente de ~10 MB, sin necesidad de instalar runtimes como Node, Python o Java.
  - Consumo de memoria ínfimo (<15 MB de RAM).
  - Configurable como servicio de Windows o ejecutable en inicio automático con icono en la barra de tareas.
* **Opción B (.NET / C#):**
  - Acceso nativo directo al spooler de Windows (`win32print`), ideal para entornos empresariales basados en Windows.
* **Opción C (Node.js empaquetado con `pkg` / `nexe`):**
  - Mismo ecosistema JavaScript/TypeScript de Lumen, empaquetado en un `.exe`.

#### 2. Protocolo de Comunicación y Payload
El POS web enviará una solicitud `POST` a `http://127.0.0.1:18080/print` con un payload JSON estructurado:

```json
{
  "storeName": "Comercial San José",
  "ticketId": "a1b2c3d4",
  "cashier": "María Quispe",
  "date": "2026-10-03T17:20:00Z",
  "items": [
    { "name": "Arroz Grano de Oro 1kg", "qty": 2, "price": 9.50, "subtotal": 19.00 }
  ],
  "subtotal": 19.00,
  "discount": 0.00,
  "total": 19.00,
  "paymentMethod": "Efectivo",
  "options": {
    "openDrawer": true,
    "cutPaper": true,
    "printerName": "default"
  }
}
```

#### 3. Capacidades de Hardware que desbloquea:
* **Comandos ESC/POS Nativos:**
  - Corte de papel: `GS V 66 0`
  - Apertura de cajón monedero por RJ11: `ESC p 0 25 250`
  - Negrita, alineación y tamaños de fuente térmica nativa (48 columnas para papel de 80mm, 32 columnas para papel de 58mm).
  - Códigos de barras y QR impresos a resolución térmica de 203 DPI.

#### 4. Estrategia Híbrida de Fallback en el Frontend (`useThermalPrinter.ts`)
Para garantizar que el sistema nunca deje de funcionar, la llamada en el POS intentará comunicarse con el agente local primero:
```ts
try {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 400) // Timeout rápido de 400ms

  await fetch('http://127.0.0.1:18080/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticketData),
    signal: controller.signal,
  })
} catch {
  // Si el agente local no está corriendo o el usuario está en tablet/móvil:
  // Se activa automáticamente window.print() como respaldo sin romper la venta.
  window.print()
}
```

#### 5. Atajo Inmediato Provisional (Sin programar software)
Si se desea eliminar la ventana emergente en una PC fija mientras se desarrolla el agente:
* Iniciar Chrome o Edge con el parámetro `--kiosk-printing`:
  ```bash
  chrome.exe --kiosk-printing "https://tu-dominio-lumen.com/pos"
  ```
* Esto hace que el navegador imprima en silencio a la impresora configurada por defecto en Windows.
