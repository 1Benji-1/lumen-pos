export interface DocsArticle {
  id: string
  title: string
  shortTitle?: string
  description: string
  badge?: string
  content: {
    overview: string
    sections: {
      subtitle: string
      paragraphs: string[]
      steps?: string[]
      callout?: {
        type: 'info' | 'warning' | 'tip'
        title: string
        text: string
      }
    }[]
  }
}

export interface DocsCategory {
  id: string
  title: string
  description: string
  articles: DocsArticle[]
}

export const DOCS_DATA: DocsCategory[] = [
  {
    id: 'negocio',
    title: 'Negocio',
    description: 'Conceptos fundamentales, ciclo operativo y arquitectura.',
    articles: [
      {
        id: 'vision-general',
        title: 'Visión General de Lumen POS',
        shortTitle: 'Visión General',
        description: 'Estructura operativa, roles y funcionamiento offline-first.',
        content: {
          overview:
            'Lumen POS es un sistema de Punto de Venta y gestión de inventario para comercio minorista (retail). Está diseñado con un enfoque offline-first, lo que garantiza que las ventas en mostrador nunca se detengan ante cortes de internet.',
          sections: [
            {
              subtitle: 'Estructura del Sistema',
              paragraphs: [
                'La plataforma se divide en áreas operativas interconectadas:',
                '1. Panel de Control (Dashboard): Supervisión en tiempo real de ingresos del día, estado de caja registradora y alertas de inventario.',
                '2. Punto de Venta (Caja): Interfaz ágil para cajeros con apertura de turno, cobro multimoneda/multimétodo, arqueos y cierre con cálculo de diferencias.',
                '3. Inventario y Catálogo: Control de existencias, productos simples y con variantes, movimientos de stock y conteos físicos a ciegas.',
                '4. Clientes: Registro y consulta del historial de compras.',
                '5. Analíticas: Métricas de ventas brutas, ticket promedio, margen comercial y productos más vendidos.',
                '6. Personal: Control de acceso para cajeros, encargados y administradores.',
                '7. Configuración: Personalización del formato de tickets (58mm/80mm), apertura de gaveta de dinero y políticas de venta.',
              ],
            },
            {
              subtitle: 'Arquitectura Offline-First',
              paragraphs: [
                'Cuando el equipo pierde la conexión a internet, el sistema detecta automáticamente el estado offline y almacena las transacciones en una base de datos local (IndexedDB) del navegador.',
                'Al restablecerse la conexión a la red, las ventas guardadas localmente se sincronizan con la base de datos central sin requerir intervención manual del cajero.',
              ],
              callout: {
                type: 'info',
                title: 'Indicador en barra superior',
                text: 'El estado de la conexión se muestra en tiempo real en la barra de navegación superior. Si hay ventas pendientes de sincronizar, se reflejará un contador específico.',
              },
            },
          ],
        },
      },
      {
        id: 'ciclo-diario',
        title: 'El Ciclo Operativo Diario',
        shortTitle: 'Ciclo Operativo',
        description: 'Paso a paso de la rutina diaria desde que abre la tienda hasta el cierre.',
        content: {
          overview:
            'El flujo diario en Lumen POS sigue una secuencia estricta para garantizar la cuadratura exacta del dinero y la precisión del stock en el inventario.',
          sections: [
            {
              subtitle: '1. Inicio de Jornada: Apertura de Caja',
              paragraphs: [
                'Antes de realizar la primera venta, el cajero o supervisor debe ingresar al módulo de Caja (/pos).',
                'El sistema solicitará el Monto Inicial en Efectivo (fondo de caja para dar cambio). Una vez confirmado, la caja pasa a estado "Caja abierta" y el indicador del navbar se activa en color verde.',
              ],
            },
            {
              subtitle: '2. Durante el Día: Ventas, Cobros y Movimientos',
              paragraphs: [
                'Los productos se agregan al carrito mediante el lector de código de barras o buscando por nombre en el catálogo táctil.',
                'Si se retira dinero de la gaveta (por ejemplo, para pagar a un proveedor de pan o un flete urgente) o si ingresa dinero externo, se debe registrar mediante el botón "Ingreso / Retiro" con su motivo.',
                'Si el supervisor desea verificar el dinero acumulado en la gaveta a mitad del día sin interrumpir las ventas, puede generar un "Arqueo X" (Corte X).',
              ],
            },
            {
              subtitle: '3. Fin de Jornada: Cierre de Caja (Corte Z)',
              paragraphs: [
                'Al finalizar el turno o el día, el cajero pulsa "Cerrar Caja". El sistema solicita contar el dinero físico en billetes y monedas.',
                'Al ingresar el monto contado, el sistema calcula de inmediato si existe un sobrante, faltante o si el turno cerró exacto, generando el reporte fiscal/operativo de Cierre Z.',
              ],
            },
          ],
        },
      },
    ],
  },
  {
    id: 'ventas-caja',
    title: 'Ventas y Caja',
    description: 'Cobros, métodos de pago, turnos, arqueos, cierres y devoluciones.',
    articles: [
      {
        id: 'apertura-y-turnos',
        title: 'Apertura de Turno y Fondo de Caja',
        shortTitle: 'Apertura y Turnos',
        description: 'Cómo iniciar el turno registrador y asignar el fondo para cambio.',
        content: {
          overview:
            'La caja registradora controla todas las operaciones de dinero en efectivo en el mostrador. Toda venta requiere que exista un turno activo asignado a la estación.',
          sections: [
            {
              subtitle: 'Procedimiento de Apertura',
              paragraphs: [
                'Para iniciar la caja registradora:',
              ],
              steps: [
                'Dirígete al módulo Caja (/pos) desde el menú lateral o el botón de acceso rápido.',
                'Si no hay turno abierto, verás el formulario de Apertura de Caja.',
                'Ingresa el monto de apertura en efectivo (por ejemplo, 100 Bs. para cambio).',
                'Pulsa el botón "Abrir caja". El turno quedará registrado con la fecha, hora exacta y el usuario responsable.',
              ],
              callout: {
                type: 'tip',
                title: 'Múltiples Cajas',
                text: 'En los planes con soporte multi-caja habilitado, distintos cajeros pueden tener su propia caja registradora abierta simultáneamente en diferentes dispositivos.',
              },
            },
          ],
        },
      },
      {
        id: 'movimientos-de-efectivo',
        title: 'Entradas y Salidas de Efectivo (Gastos Menores)',
        shortTitle: 'Entradas y Salidas',
        description: 'Cómo justificar el dinero que entra o sale de la gaveta sin ser una venta.',
        content: {
          overview:
            'Cualquier alteración en el dinero de la gaveta física que no provenga de una venta directa debe quedar registrada para evitar descuadres en el Cierre Z.',
          sections: [
            {
              subtitle: 'Registro de Movimientos',
              paragraphs: [
                'En el panel de control de la caja activa, haz clic en el botón "Ingreso / Retiro". Se abrirá una ventana emergente donde debes seleccionar:',
                '• Ingreso de efectivo (cash_in): Aporte extra de dinero a la caja (ej. cambio traído del banco).',
                '• Retiro de efectivo (cash_out): Salida de dinero de la caja registradora.',
              ],
              steps: [
                'Selecciona el tipo de movimiento (Ingreso o Retiro).',
                'Escribe el monto exacto.',
                'Escribe obligatoriamente el motivo detallado (ej. "Pago a repartidor de refrescos", "Compra de bolsas").',
                'Pulsa "Confirmar movimiento". El monto esperado en caja se recalculará al instante.',
              ],
            },
          ],
        },
      },
      {
        id: 'cobro-y-metodos-de-pago',
        title: 'Venta y Métodos de Pago',
        shortTitle: 'Venta y Métodos de Pago',
        description: 'Búsqueda de productos, escáner, carrito y cobro en Efectivo, Tarjeta, QR y Mixto.',
        content: {
          overview:
            'La interfaz de venta permite seleccionar productos con fluidez táctil o mediante escáner físico de código de barras.',
          sections: [
            {
              subtitle: 'Agregar Productos al Carrito',
              paragraphs: [
                '• Con lector de código de barras: Escanea el código del producto. El sistema lo agregará inmediatamente al carrito incrementando la cantidad.',
                '• Búsqueda por texto: Escribe el nombre o código en el buscador superior del catálogo.',
                '• Categorías: Pulsa sobre las pestañas de categorías para filtrar el catálogo visualmente.',
              ],
            },
            {
              subtitle: 'Opciones del Carrito',
              paragraphs: [
                'En el panel lateral derecho del carrito puedes:',
                '• Modificar la cantidad de cada producto con los botones (+) y (-).',
                '• Eliminar una línea con el botón de papelera.',
                '• Agregar notas específicas a la venta (ej. "Entregar en caja 2", "Cliente recoge por la tarde").',
              ],
            },
            {
              subtitle: 'Los 4 Métodos de Pago Reales',
              paragraphs: [
                'Al hacer clic en "Cobrar", se abre el modal de checkout con cuatro opciones:',
                '1. Efectivo: Muestra botones con billetes rápidos (20, 50, 100, 200) y calcula automáticamente el cambio exacto a devolver al cliente.',
                '2. Tarjeta: Para cobros por datafono/POS bancario físico. Permite registrar el número de autorización o comprobante.',
                '3. QR / Transferencia: Para pagos bancarios digitales (ej. QR Simple / transferencia). Permite registrar el número de referencia de la transacción.',
                '4. Pago Mixto: Permite dividir el total del ticket entre dos métodos (por ejemplo, parte en efectivo y el saldo restante mediante QR).',
              ],
            },
            {
              subtitle: 'Comprobante y Ticket',
              paragraphs: [
                'Al confirmar el cobro, la venta queda guardada en la base de datos y se muestra el comprobante listo para imprimir en la impresora térmica de 58mm u 80mm configurada en Ajustes.',
              ],
            },
          ],
        },
      },
      {
        id: 'arqueo-x-y-cierre-z',
        title: 'Arqueo Parcial (Corte X) y Cierre (Corte Z)',
        shortTitle: 'Arqueo X y Cierre Z',
        description: 'Diferencias operativas entre Corte X y Corte Z, conciliación y cálculo de diferencias.',
        content: {
          overview:
            'El sistema separa con claridad la consulta de auditoría intermedia del cierre definitivo de la sesión.',
          sections: [
            {
              subtitle: 'Arqueo Parcial (Corte X)',
              paragraphs: [
                'El Corte X es una visualización informativa. No cierra la caja, no bloquea el turno y no altera ningún dato.',
                'Muestra el monto inicial de apertura, el total de ventas cobradas desglosadas por método de pago (Efectivo, Tarjetas, QR), las entradas y salidas de efectivo, y el total que debería haber en la gaveta en ese momento.',
              ],
            },
            {
              subtitle: 'Cierre Definitivo de Turno (Corte Z)',
              paragraphs: [
                'El Corte Z finaliza el turno del cajero de forma irrevocable.',
              ],
              steps: [
                'El cajero pulsa "Cerrar caja" en el panel de Punto de Venta.',
                'El sistema solicita contar el dinero en efectivo que hay físicamente en la gaveta e introducirlo.',
                'El sistema compara el dinero contado contra el dinero teórico esperado y calcula automáticamente la diferencia (Diferencia = 0: Turno exacto; Diferencia positiva: Sobrante; Diferencia negativa: Faltante).',
                'Al confirmar, el turno se cierra, se genera el comprobante de Cierre Z y la caja queda lista para una nueva apertura.',
              ],
            },
          ],
        },
      },
      {
        id: 'historial-y-devoluciones',
        title: 'Historial de Ventas y Devoluciones',
        shortTitle: 'Historial y Devoluciones',
        description: 'Reimpresión de tickets y anulación de ventas con reintegro a caja activa y stock.',
        content: {
          overview:
            'En la pestaña /pos/ventas puedes consultar todos los comprobantes emitidos en el negocio con filtros por fecha, número de venta o cajero.',
          sections: [
            {
              subtitle: 'Reimpresión de Tickets',
              paragraphs: [
                'Cada venta del historial cuenta con un botón de visualización que permite reabrir el ticket térmico y enviarlo nuevamente a imprimir en caso de atasco de papel o solicitud del cliente.',
              ],
            },
            {
              subtitle: 'Anulación y Devolución a Caja Activa',
              paragraphs: [
                'Si un cliente devuelve un producto o una venta fue registrada por error, el sistema cuenta con la función de anulación controlada.',
                'Al pulsar "Anular venta / Devolver":',
                '1. La venta cambia su estado a anulada.',
                '2. El stock de todos los artículos incluidos en el ticket se reincorpora automáticamente al inventario disponible.',
                '3. Si la venta fue cobrada en efectivo, el importe se deduce de la caja registradora abierta en ese momento para mantener la cuadratura contable.',
              ],
              callout: {
                type: 'warning',
                title: 'Caja activa requerida',
                text: 'Para realizar devoluciones de dinero en efectivo, el operador debe tener un turno de caja abierto en el momento de procesar la anulación.',
              },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'inventario',
    title: 'Inventario',
    description: 'Gestión de productos, variantes, categorías, auditorías ciegas y compras.',
    articles: [
      {
        id: 'productos-y-variantes',
        title: 'Productos Simples y con Variantes',
        shortTitle: 'Productos y Variantes',
        description: 'Cómo registrar artículos unitarios o con talles, colores y presentaciones.',
        content: {
          overview:
            'Lumen POS admite tanto productos estándar con un único código como productos multidimensionales con variantes.',
          sections: [
            {
              subtitle: 'Productos Simples',
              paragraphs: [
                'Ideales para artículos que se venden por unidad fija (ej. una bebida en lata, un cuaderno, un paquete de galletas).',
                'Campos requeridos: Nombre del producto, Categoría, Precio de venta, Costo de compra, Código de barras (o SKU) y Cantidad inicial en stock.',
              ],
            },
            {
              subtitle: 'Productos con Variantes (Plan Pro y Empresa)',
              paragraphs: [
                'Para tiendas de ropa, calzado, farmacia o ferretería donde un producto matriz tiene múltiples opciones (ej. Polera Deportiva en talles S, M, L y colores Azul, Negro).',
                'En el formulario de alta de producto (/inventario/agregar-producto), se activa la casilla "Tiene variantes". Permite definir los atributos y genera combinaciones automáticas.',
                'Cada variante cuenta con su propio código de barra independiente, su propio stock y su propio precio si fuera diferente.',
              ],
            },
          ],
        },
      },
      {
        id: 'categorias-protegidas',
        title: 'Categorías y Familias',
        shortTitle: 'Categorías y Familias',
        description: 'Organización del catálogo y protección de borrado contra artículos huérfanos.',
        content: {
          overview:
            'Las categorías permiten ordenar el catálogo y acelerar el filtrado en la pantalla de cobro del mostrador.',
          sections: [
            {
              subtitle: 'Creación de Categorías',
              paragraphs: [
                'Desde /inventario/agregar-categoria puedes dar de alta nuevas familias asignándoles un nombre y una descripción.',
              ],
            },
            {
              subtitle: 'Protección de Integridad',
              paragraphs: [
                'Para proteger la integridad del catálogo y evitar inconsistencias en reportes de ventas históricas, el sistema impide eliminar cualquier categoría que contenga productos asociados.',
                'Si necesitas borrar una categoría, primero debes reasignar o desactivar los artículos que pertenezcan a ella.',
              ],
            },
          ],
        },
      },
      {
        id: 'movimientos-y-ajustes',
        title: 'Historial de Movimientos de Stock',
        shortTitle: 'Movimientos de Stock',
        description: 'Auditoría de compras, ventas, mermas y ajustes manuales obligatorios con motivo.',
        content: {
          overview:
            'El sistema audita cada variación en las existencias físicas en la pantalla /inventario/movimientos.',
          sections: [
            {
              subtitle: 'Trazabilidad Completa',
              paragraphs: [
                'Cada registro de movimiento documenta:',
                '• Fecha y hora exacta.',
                '• Tipo de evento: Venta, Devolución de cliente, Entrada por compra, Merma o Ajuste manual.',
                '• Producto o variante afectada.',
                '• Cantidad modificada, stock anterior y nuevo stock resultante.',
                '• Usuario responsable que ejecutó la operación.',
                '• Motivo o justificación documentada.',
              ],
            },
          ],
        },
      },
      {
        id: 'conteo-fisico-ciego',
        title: 'Conteo Físico a Ciegas (Toma de Inventario)',
        shortTitle: 'Conteo Físico a Ciegas',
        description: 'Auditoría de inventario físico sin ver las cantidades teóricas para detectar mermas.',
        content: {
          overview:
            'Disponible en planes Profesional y Empresa en la ruta /inventario/conteo-fisico.',
          sections: [
            {
              subtitle: 'Metodología a Ciegas',
              paragraphs: [
                'En un conteo tradicional, el personal suele asumir que las existencias del sistema son correctas sin contar minuciosamente.',
                'El módulo de Conteo Físico de Lumen POS oculta las cantidades del sistema durante el proceso de escaneo y conteo manual en los estantes.',
                'Al finalizar el recuento, el sistema genera la comparativa: Cantidad física vs Cantidad en sistema, calculando el descuadre exacto en unidades y valor monetario, y permitiendo conciliar el inventario con un solo clic.',
              ],
            },
          ],
        },
      },
      {
        id: 'proveedores-y-ordenes',
        title: 'Proveedores y Órdenes de Compra',
        shortTitle: 'Proveedores y Compras',
        description: 'Agenda de abastecedores y recepción de mercadería (Plan Empresa).',
        content: {
          overview:
            'El módulo empresarial de compras (/inventario/proveedores y /inventario/ordenes-compra) permite registrar los pedidos a distribuidores.',
          sections: [
            {
              subtitle: 'Recepción de Mercadería',
              paragraphs: [
                'Al recibir el pedido de un proveedor en el local, se marca la orden como recepcionada. El sistema incrementa automáticamente el stock de los productos recibidos y actualiza el costo promedio de compra de cada artículo.',
              ],
            },
          ],
        },
      },
      {
        id: 'etiquetas-y-precios',
        title: 'Etiquetas de Código de Barras y Ajuste Masivo',
        shortTitle: 'Etiquetas y Precios',
        description: 'Generación de códigos EAN-13/CODE128 y modificación masiva de listas de precios.',
        content: {
          overview:
            'Herramientas avanzadas de gestión para el catálogo minorista.',
          sections: [
            {
              subtitle: 'Generador de Etiquetas de Código de Barras',
              paragraphs: [
                'Desde el catálogo de productos puedes pulsar el botón de etiqueta para generar e imprimir códigos en formato EAN-13 o CODE128 para pegar en productos sin código de fábrica o en estanterías.',
              ],
            },
            {
              subtitle: 'Ajuste Masivo de Precios (/inventario/ajuste-precios)',
              paragraphs: [
                'Permite seleccionar una categoría completa y aplicar un incremento o decremento porcentual o por importe fijo a todos los artículos en un solo paso, ahorrando horas de edición manual.',
              ],
            },
          ],
        },
      },
    ],
  },
  {
    id: 'gestion',
    title: 'Gestión',
    description: 'Directorio de clientes, analíticas comerciales y personal.',
    articles: [
      {
        id: 'registro-e-historial',
        title: 'Ficha de Cliente e Historial de Compras',
        shortTitle: 'Clientes e Historial',
        description: 'Registro con CI/NIT y consulta de tickets previos adquiridos por el cliente.',
        content: {
          overview:
            'El módulo de Clientes (/customers) permite mantener el registro de los compradores habituales de la tienda.',
          sections: [
            {
              subtitle: 'Datos del Cliente',
              paragraphs: [
                'Se registran: Nombre o Razón Social, Documento de identidad (CI / NIT), Teléfono, Correo electrónico y Dirección.',
                'El cliente puede registrarse desde este módulo central o directamente en el mostrador de cobro mientras se realiza la venta.',
              ],
            },
            {
              subtitle: 'Historial de Compras',
              paragraphs: [
                'Al abrir la ficha de cualquier cliente, puedes consultar todos los tickets emitidos a su nombre, las fechas de visita, los importes pagados y el detalle de los productos que compró.',
              ],
            },
          ],
        },
      },
      {
        id: 'kpis-y-metricas',
        title: 'Indicadores Clave (KPIs)',
        shortTitle: 'Indicadores y Reportes',
        description: 'Ventas brutas, ticket promedio, transacciones y margen comercial.',
        content: {
          overview:
            'En /analytics el dueño o supervisor puede evaluar el desempeño financiero del negocio filtrando por periodos: Hoy, Ayer, Esta semana, Últimos 7 días, Este mes o Fechas personalizadas.',
          sections: [
            {
              subtitle: 'Significado de los Indicadores',
              paragraphs: [
                '• Ventas Brutas: Dinero total facturado en el periodo seleccionado.',
                '• Ticket Promedio: Importe medio de compra por cada cliente (Ventas brutas ÷ Número de ventas).',
                '• Transacciones: Cantidad total de tickets de venta concretados.',
                '• Margen Comercial: Porcentaje y beneficio neto estimado tras deducir el costo de compra de los artículos vendidos.',
              ],
            },
            {
              subtitle: 'Desglose por Método de Pago',
              paragraphs: [
                'Muestra la proporción de dinero ingresado en Efectivo físico versus los fondos depositados en banco mediante QR o Tarjetas, facilitando la conciliación bancaria.',
              ],
            },
            {
              subtitle: 'Ranking de Productos Más Vendidos',
              paragraphs: [
                'Tabla con los artículos estrella del negocio, indicando la cantidad de unidades vendidas y el volumen total de dinero generado por cada uno.',
              ],
            },
          ],
        },
      },
      {
        id: 'roles-y-permisos',
        title: 'Los 3 Roles Reales del Sistema',
        shortTitle: 'Personal y Roles',
        description: 'Permisos y limitaciones de Cajero, Encargado y Administrador.',
        content: {
          overview:
            'Lumen POS define tres perfiles de seguridad para resguardar la información confidencial de la tienda.',
          sections: [
            {
              subtitle: '1. Cajero (cashier)',
              paragraphs: [
                'Perfil de mostrador enfocado en velocidad de atención:',
                '• Puede abrir y cerrar su propio turno de caja registradora.',
                '• Puede buscar productos, agregar al carrito y procesar cobros.',
                '• Puede registrar entradas y salidas de efectivo justificadas.',
                '• No tiene acceso a reportes financieros, ajustes de negocio ni gestión de personal.',
              ],
            },
            {
              subtitle: '2. Encargado / Supervisor (manager)',
              paragraphs: [
                'Perfil de control de piso de venta:',
                '• Acceso completo a caja registradora y arqueos de turno.',
                '• Gestión completa de inventario: altas de productos, variantes, movimientos y conteos físicos.',
                '• Gestión de órdenes de compra y proveedores.',
                '• Consulta de historial de ventas y clientes.',
                '• Restringido para cambios estructurales de suscripción o borrado de personal administrativo.',
              ],
            },
            {
              subtitle: '3. Administrador / Dueño (admin)',
              paragraphs: [
                'Acceso total e irrestricto a todos los módulos: finanzas, márgenes de ganancia, alta/baja de personal, configuración de impresoras, facturación y plan de suscripción.',
              ],
            },
          ],
        },
      },
    ],
  },
  {
    id: 'cuenta',
    title: 'Cuenta',
    description: 'Hardware, comprobantes, políticas de venta y niveles de suscripción.',
    articles: [
      {
        id: 'impresoras-y-tickets',
        title: 'Impresoras Térmicas y Formato de Ticket',
        shortTitle: 'Impresoras y Tickets',
        description: 'Configuración de papel de 58mm y 80mm, encabezado y pie de comprobante.',
        content: {
          overview:
            'En /configuracion > Comprobantes puedes personalizar la impresión física de los recibos de venta.',
          sections: [
            {
              subtitle: 'Ancho de Papel (58mm vs 80mm)',
              paragraphs: [
                '• 58mm: Formato compacto para impresoras portátiles o de mostrador pequeño. Ajusta automáticamente las columnas para evitar saltos de línea irregulares.',
                '• 80mm: Formato estándar de retail con mayor amplitud para descripciones largas y desglose fiscal detallado.',
              ],
            },
            {
              subtitle: 'Cabecera y Pie de Página',
              paragraphs: [
                'Permite definir el mensaje de bienvenida, dirección de la sucursal, número telefónico y mensaje de agradecimiento o políticas de cambio al final del ticket.',
              ],
            },
            {
              subtitle: 'Apertura de Gaveta RJ11',
              paragraphs: [
                'En la sección de Gaveta de Dinero puedes habilitar la apertura automática de la gaveta portamonedas. Al emitir el ticket de cobro, la impresora envía el pulso eléctrico por el cable RJ11 para destrabar la gaveta.',
              ],
            },
          ],
        },
      },
      {
        id: 'politicas-y-subrubros',
        title: 'Subrubros Minoristas y Políticas de Venta',
        shortTitle: 'Políticas y Subrubros',
        description: 'Venta con stock negativo, redondeo de vuelto y personalización de rubro.',
        content: {
          overview:
            'Lumen POS adapta sus opciones según la realidad operativa del comercio.',
          sections: [
            {
              subtitle: 'Subrubros de Retail',
              paragraphs: [
                'Puedes configurar el subrubro exacto de tu tienda: Almacén de barrio, Farmacia, Ferretería, Boutique de moda, Minimarket, Librería/Papelería, Electrónica/Repuestos, Tienda de mascotas u Otro.',
              ],
            },
            {
              subtitle: 'Política de Venta sin Stock',
              paragraphs: [
                'En /configuracion > Ventas y Caja puedes determinar si el sistema permite vender productos con stock en cero (permitiendo stock negativo si recibes mercadería antes de registrar la factura) o si bloquea la venta para exigir reposición previa.',
              ],
            },
          ],
        },
      },
      {
        id: 'comparativa-de-planes',
        title: 'Capacidades por Plan de Suscripción',
        shortTitle: 'Plan y Límites',
        description: 'Límites de cajas, usuarios, productos y módulos avanzados disponibles.',
        content: {
          overview:
            'Las características del sistema se adaptan al tamaño y volumen de cada comercio minorista según la definición oficial en packages/types/src/plans.ts.',
          sections: [
            {
              subtitle: '1. Plan Básico (basic)',
              paragraphs: [
                'Diseñado para tiendas pequeñas o locales de atención única:',
                '• 1 Caja Registradora activa.',
                '• Hasta 2 usuarios con roles.',
                '• Catálogo de hasta 500 productos simples.',
                '• Ventas ilimitadas y funcionamiento offline con sincronización.',
                '• Reportes de ventas esenciales.',
              ],
            },
            {
              subtitle: '2. Plan Profesional (pro)',
              paragraphs: [
                'Para negocios en crecimiento con mayor catálogo y personal:',
                '• Cajas registradoras adicionales.',
                '• Hasta 5 usuarios con roles diferenciados.',
                '• Catálogo de hasta 3.000 productos.',
                '• Habilita productos con variantes multidimensionales (talles, colores).',
                '• Habilita Conteo Físico ciego para auditoría de inventario.',
                '• Habilita Ajuste Masivo de Precios por categoría.',
                '• Impresión y generación de etiquetas con códigos de barra.',
              ],
            },
            {
              subtitle: '3. Plan Empresa / Business (enterprise)',
              paragraphs: [
                'Para cadenas, sucursales de alto tráfico o comercios de gran escala:',
                '• Cajas registradoras ilimitadas.',
                '• Usuarios y colaboradores ilimitados.',
                '• Catálogo de productos ilimitado.',
                '• Módulo completo de Proveedores y Órdenes de Compra con recepción de mercadería.',
                '• Auditoría avanzada de inventario.',
                '• Soporte técnico prioritario.',
              ],
            },
          ],
        },
      },
    ],
  },
]
