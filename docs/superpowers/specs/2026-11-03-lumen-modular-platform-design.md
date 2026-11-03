# Lumen como plataforma modular para comercios

**Fecha:** 2026-11-03  
**Estado:** Aprobado  
**Alcance:** Arquitectura funcional del producto y dirección para reestructurar el POS existente

## 1. Intención y motivo

Lumen no debe quedar limitado a minimarkets o supermercados. Debe convertirse en una plataforma comercial que pueda adaptarse a comercios minoristas, gastronomía, negocios de servicios, mayoristas y negocios híbridos.

El sistema debe poder venderse como un POS independiente, sin página web. Cuando un comercio necesite catálogo público, carrito o pedidos por Internet, la web será un canal opcional conectado al mismo negocio, catálogo, clientes, pedidos e inventario.

El objetivo no es construir un sistema separado para cada rubro. El objetivo es mantener un núcleo común y habilitar únicamente las capacidades que cada comercio necesite.

## 2. Decisiones acordadas

- Lumen será una única plataforma multiempresa.
- Cada cliente tendrá sus datos aislados mediante una organización o tenant; sus sucursales operarán dentro de ese límite.
- Cada negocio se organizará mediante una familia operativa y una categoría específica.
- La familia definirá el modelo general de operación y el catálogo amplio de módulos aplicables.
- La categoría añadirá, retirará y preconfigurará módulos y capacidades según la forma concreta de trabajar.
- Las funcionalidades se organizarán en módulos y capacidades combinables.
- Se mantendrán los tres niveles de plan existentes (`standard`, `pro` y `enterprise`, independientemente de su nombre comercial final).
- El plan determinará los módulos y capacidades contratados, además de límites como productos, usuarios, cajas, sucursales y almacenamiento.
- Los permisos de los empleados serán independientes de los módulos contratados por el negocio.
- La página web, catálogo público, carrito y pedidos online serán opcionales.
- Un negocio podrá operar solamente con el POS, solamente con canales digitales cuando el producto lo permita, o con ambos.
- Las páginas públicas podrán ser diseñadas a medida, pero consumirán el mismo núcleo comercial mediante una interfaz segura.
- Los negocios híbridos se resolverán combinando módulos, no creando un tipo de sistema nuevo.
- La suscripción pertenecerá a una organización cliente.
- Una organización podrá contener una o varias sucursales según su plan.
- Cada sucursal tendrá su propia familia, categoría y activación operativa de módulos; una misma organización podrá, por ejemplo, combinar un restaurante tradicional con una dark kitchen.
- Catálogo, clientes, identidad del personal y módulos contratados podrán compartirse a nivel organización.
- Inventario, cajas, turnos y operaciones que lo requieran se registrarán por sucursal.
- Una función solo estará disponible cuando la incluya la categoría o una combinación híbrida válida, esté concedida por el plan, esté activa en su ámbito y el empleado tenga permiso.
- La categoría proporcionará una configuración predeterminada, no una prohibición irreversible: el propietario podrá reactivar un módulo retirado cuando el plan lo incluya y la operación se configure como híbrida.
- Lumen administrará planes, límites y excepciones comerciales; el propietario administrará la activación de los módulos ya incluidos en su plan.
- Bajar de plan, cambiar de categoría o desactivar un módulo nunca eliminará datos históricos.

## 3. Metas

- Atender varias familias de comercios sin duplicar aplicaciones ni reglas de negocio.
- Permitir que cada cliente vea solamente las funciones que necesita.
- Conservar y reutilizar las funciones valiosas que ya existen en el POS.
- Facilitar la incorporación futura de módulos, canales y familias comerciales.
- Mantener una única fuente de verdad para productos, servicios, clientes, pedidos, ventas y pagos.
- Conservar la progresión de los planes actuales: nivel esencial con funciones y límites reducidos, nivel intermedio con mayor capacidad y Enterprise con las funciones relevantes y límites superiores.
- Permitir rediseñar la interfaz sin volver a mezclar presentación y reglas del negocio.

## 4. No metas para esta etapa

- Construir de inmediato todas las funciones de todas las familias.
- Reescribir desde cero el POS actual.
- Crear una aplicación o base de datos independiente por cliente.
- Convertir prematuramente el sistema en microservicios.
- Incluir contabilidad completa, nómina, historias clínicas, gestión hotelera u otras áreas altamente reguladas.
- Obligar a que todos los comercios tengan inventario, caja o sitio web.

## 5. Antiobjetivos

La reestructuración se consideraría fallida si produce cualquiera de estas situaciones:

- Una copia del POS por rubro o por cliente.
- Condicionales repartidos por toda la interfaz según el tipo de comercio.
- Menús ocultos visualmente que continúan accesibles sin autorización real.
- Módulos que duplican productos, clientes o ventas en tablas incompatibles.
- Una migración total que interrumpe lo que ya funciona durante meses.
- Un catálogo público con acceso directo e inseguro a operaciones internas.
- Un modelo donde agregar una nueva familia obliga a modificar todo el sistema.

## 6. Conceptos del producto

### 6.1 Familia comercial

Describe el modo general de operar de un negocio y ofrece una configuración inicial. Las familias iniciales serán:

1. Comercio minorista.
2. Gastronomía.
3. Servicios con venta.
4. Mayoristas y distribuidores.
5. Negocios híbridos, formados mediante combinación de módulos.

### 6.2 Categoría comercial

Describe la forma concreta de operar dentro de una familia. La categoría no es solamente una etiqueta: define una configuración inicial capaz de añadir o retirar módulos completos y de habilitar capacidades particulares.

Por ejemplo, dentro de gastronomía un restaurante común incorpora mesas, mientras que una dark kitchen las retira y prioriza pedidos, cocina y delivery. Dentro de comercio minorista, ropa incorpora matrices de talla y color, mientras que tecnología incorpora números de serie y garantías.

La categoría proporciona el punto de partida. Una sucursal podrá combinar módulos cuando su operación sea híbrida y su plan lo permita, sin crear otra aplicación. Por ello, retirar un módulo significa dejarlo desactivado por defecto, no borrar su capacidad del producto.

### 6.3 Módulo

Es una unidad funcional visible y contratable, como inventario, caja, compras, cocina o agenda.

### 6.4 Capacidad

Es una función más granular dentro de un módulo. Por ejemplo, el módulo de inventario puede ofrecer lotes, vencimientos, números de serie, productos pesables o múltiples almacenes.

### 6.5 Canal

Es el lugar desde el que se origina una operación comercial. Los canales previstos son POS, web, pedido manual, delivery e integraciones futuras.

### 6.6 Permiso

Define lo que una persona puede hacer dentro de los módulos disponibles para el negocio. Tener un módulo contratado no concede automáticamente acceso a todos los empleados.

### 6.7 Plan

Es el nivel comercial contratado por la organización. Lumen mantendrá tres niveles: `standard`, `pro` y `enterprise` —aunque sus nombres visibles puedan ajustarse posteriormente—. El plan tiene dos responsabilidades:

1. Incluir o excluir módulos y capacidades.
2. Establecer límites cuantitativos, por ejemplo productos, usuarios, cajas, sucursales o almacenamiento.

El plan no cambia la familia ni la categoría. Enterprise concede todas las funciones relevantes para la configuración del negocio, no módulos ajenos que no tengan sentido operativo.

## 7. Enfoques considerados

### Enfoque A: copiar y adaptar el POS por cliente o rubro

Permitiría lanzar el primer caso personalizado rápidamente, pero cada corrección, cambio de seguridad y mejora tendría que repetirse. Las versiones se separarían y sería difícil mantener datos y funciones compatibles.

**Decisión:** descartado.

### Enfoque B: una aplicación con tipos de comercio rígidos

Cada tipo tendría una lista fija de pantallas y numerosos condicionales. Es similar al modelo actual de `tienda_articulos`, `restaurante` y `supermercado`. Funciona con pocos rubros, pero crece mal cuando aparecen negocios híbridos o clientes que necesitan excepciones.

**Decisión:** descartado como arquitectura final. Los tipos rígidos se conservarán temporalmente solo durante la migración.

### Enfoque C: núcleo compartido, familia, categoría, plan y permisos

Todas las familias comparten las entidades comerciales centrales. La familia delimita el modelo operativo general, la categoría compone la configuración inicial de módulos, el plan aplica funciones y límites comerciales, y los permisos delimitan las acciones de cada empleado.

**Decisión:** enfoque elegido porque permite ampliar el mercado sin duplicar el producto y admite comercios híbridos.

## 8. Núcleo común de la plataforma

Todo negocio tendrá acceso a una base mínima coherente, aunque algunas pantallas o capacidades puedan depender del plan:

- Organización, tienda y sucursales.
- Usuarios, roles, permisos y auditoría.
- Catálogo de elementos vendibles: productos y/o servicios.
- Categorías, precios, impuestos y unidades aplicables.
- Clientes.
- Pedidos y ventas.
- Pagos y comprobantes.
- Descuentos, anulaciones y devoluciones básicas.
- Configuración de moneda, zona horaria, datos comerciales y políticas.
- Panel y reportes básicos.

El inventario no forma parte obligatoria del núcleo: un negocio que vende únicamente servicios puede no necesitar existencias.

## 9. Catálogo de módulos transversales

| Módulo | Responsabilidad principal |
|---|---|
| POS | Carrito, búsqueda, escaneo, descuentos, cobros y tickets |
| Caja | Apertura, turnos, movimientos, arqueos, cortes y cierre |
| Inventario | Existencias, movimientos, ajustes, alertas y almacenes |
| Compras | Proveedores, órdenes de compra, recepción y actualización de costos |
| Pedidos | Ciclo de recepción, confirmación, preparación, entrega y cancelación |
| Comercio online | Catálogo público, carrito, checkout y pedidos web |
| Delivery | Direcciones, zonas, tarifas, asignación y seguimiento |
| Clientes | Historial, notas, direcciones, preferencias y segmentación |
| Crédito | Límites, saldos, pagos parciales y cuentas por cobrar |
| Fidelización | Puntos, promociones, cupones y recompensas |
| Personal | Empleados, roles, permisos, turnos y actividad |
| Reportes avanzados | Rentabilidad, ventas, stock, rendimiento y comparativas |
| Multisucursal | Operación separada y consolidada de sucursales y almacenes |
| Integraciones | Impresoras, lectores, balanzas, pagos y API externas |
| Agenda | Reservas, disponibilidad, duración, recursos y recordatorios |
| Órdenes de trabajo | Recepción, diagnóstico, evidencias, estados, materiales y entrega |
| Cocina | Comandas, estaciones, KDS, preparación y despacho |
| Recetas | Ingredientes, rendimientos, consumo teórico y desperdicios |
| Mesas | Salón, ocupación, cuentas, división y traslado de consumos |
| Cotizaciones | Presupuestos, vigencia, aprobación y conversión en pedido o venta |

## 10. Familias, categorías y configuración recomendada

### 10.1 Comercio minorista

Incluye minimarkets, supermercados, ropa, ferreterías, farmacias, papelerías, tecnología, mascotas, repuestos y bazares.

**Base recomendada de la familia:** POS, caja, inventario, compras, clientes, personal y reportes. Cada categoría modifica esta base.

| Categoría | Ajuste de módulos | Capacidades particulares recomendadas |
|---|---|---|
| Comercio general | Conserva la base minorista | Venta por unidad, categorías, variantes sencillas, cambios y devoluciones |
| Minimarket y supermercado | Añade balanzas e integraciones cuando corresponda | Escaneo continuo, productos por peso, promociones, lotes y vencimientos |
| Ropa y calzado | Conserva la base; puede retirar compras avanzadas en planes iniciales | Variantes por talla, color, modelo y temporada; políticas de cambio |
| Ferretería y materiales | Añade cotizaciones | Venta fraccionada, múltiples unidades y listas de materiales |
| Farmacia y belleza | Refuerza inventario y trazabilidad | Lotes, vencimientos, laboratorios o fabricantes y alertas de caducidad |
| Tecnología y celulares | Puede añadir órdenes de trabajo | Números de serie, IMEI, garantías y servicio técnico |
| Papelería y copistería | Combina productos con servicios rápidos | Impresión, fotocopias, anillados y cobro por servicio |
| Repuestos | Puede añadir cotizaciones y órdenes de trabajo | Marca, modelo, año, compatibilidad y número de pieza |
| Tienda de mascotas | Puede añadir agenda y servicios | Productos, servicios y perfiles básicos de mascotas vinculados a clientes |

### 10.2 Gastronomía

Incluye restaurantes, cafeterías, bares, panaderías, comida rápida y dark kitchens.

**Base recomendada de la familia:** POS, caja, pedidos, cocina, recetas, inventario, compras y clientes. Cada categoría añade o retira módulos completos.

**Capacidades particulares:**

- Menús por horario o canal.
- Tamaños, modificadores, extras y notas de preparación.
- Comandas y estaciones de impresión o KDS.
- Estados de preparación y despacho.
- Recetas, consumo de insumos y desperdicios.
- Cuentas divididas, pagos parciales y propinas.
- Consumo en mesa, para llevar, retiro y delivery.

| Categoría | Módulos añadidos o priorizados | Módulos retirados o normalmente omitidos |
|---|---|---|
| Restaurante tradicional | Mesas, cocina, recetas y comandas | Ninguno de la base; delivery y web son opcionales |
| Cafetería | Mesas opcionales, cocina ligera y recetas | Puede omitir cocina compleja o compras avanzadas |
| Bar | Mesas, comandas, propinas e inventario de bebidas | Recetas de cocina pueden ser opcionales |
| Panadería | Producción/recetas, inventario y POS rápido | Mesas y cocina por comandas normalmente se omiten |
| Comida rápida | Pedidos, cocina, turnos y despacho rápido | Mesas pueden omitirse o simplificarse |
| Dark kitchen | Pedidos, cocina y recetas; delivery y web se recomiendan como canales opcionales | Retira mesas; el POS de mostrador puede ser opcional |

Por tanto, las mesas pertenecen al catálogo de gastronomía, pero la categoría decide si forman parte de la configuración inicial. Una dark kitchen no debe verlas ni pagarlas por defecto.

### 10.3 Servicios con venta

Incluye barberías, salones, spas, lavanderías, talleres, servicios técnicos y reparación de celulares.

**Base recomendada de la familia:** clientes, pagos, personal y reportes. Agenda, POS, caja, inventario y órdenes de trabajo dependen de la categoría.

**Capacidades particulares:**

- Catálogo de servicios, duración y precio.
- Disponibilidad de personal o recursos.
- Reservas, recordatorios, anticipos y cancelaciones.
- Especialistas, turnos y comisiones.
- Servicios recurrentes.
- Consumo opcional de materiales.
- Recepción de objetos o equipos del cliente.
- Diagnóstico, evidencias, estados, entrega y garantía de reparación.

| Categoría | Módulos añadidos o priorizados | Módulos retirados o normalmente omitidos |
|---|---|---|
| Barbería, salón o spa | Agenda, personal, comisiones, POS y caja | Órdenes de trabajo; inventario puede ser básico u opcional |
| Lavandería | Pedidos/órdenes, estados, caja y clientes | Agenda tradicional; inventario puede ser opcional |
| Taller | Órdenes de trabajo, inventario, compras y cotizaciones | Agenda de citas puede ser opcional |
| Servicio técnico | Órdenes de trabajo, evidencias, inventario y garantías | Agenda puede ser opcional |

### 10.4 Mayoristas y distribuidores

**Base recomendada de la familia:** inventario, compras, pedidos, cotizaciones, clientes, crédito, almacenes, despacho y reportes. La categoría puede añadir POS y caja para venta de mostrador o retirar módulos logísticos que no correspondan.

**Capacidades particulares:**

- Listas de precios y precios por cliente.
- Venta por unidad, paquete, caja o volumen.
- Cantidades mínimas y descuentos escalonados.
- Pedidos parciales y pendientes.
- Vendedores y carteras asignadas.
- Crédito y cuentas por cobrar.
- Múltiples almacenes y transferencias.
- Preparación, rutas y comprobación de entrega.

### 10.5 Negocios híbridos

No tendrán una arquitectura separada. Se formarán mediante combinación de módulos y capacidades.

| Ejemplo | Combinación |
|---|---|
| Cafetería con productos empacados | Gastronomía + inventario minorista |
| Barbería con cosméticos | Agenda y servicios + POS + inventario |
| Taller con repuestos | Órdenes de trabajo + inventario + compras |
| Veterinaria con tienda | Agenda y servicios + productos + inventario |
| Panadería con reparto | Gastronomía + comercio online + delivery |
| Distribuidor con mostrador | Mayorista + POS + caja |

## 11. Página web y pedidos online

El comercio online será un módulo transversal opcional, no una familia comercial ni una dependencia del POS.

- Un comercio podrá utilizar Lumen sin página web.
- Las páginas podrán tener diseños completamente personalizados.
- La página identificará la tienda y consumirá una interfaz pública segura de Lumen.
- La interfaz pública expondrá únicamente catálogo, disponibilidad permitida, carrito y creación o consulta controlada de pedidos.
- Los precios, reglas de stock y totales finales se validarán en el servidor.
- Los pedidos compartirán el mismo núcleo y registrarán su canal de origen.
- El panel del comercio recibirá los pedidos web sin requerir un segundo sistema administrativo.

## 12. Situación actual del proyecto

La base existente ya aporta elementos útiles:

- Separación de datos mediante `store_id`.
- Aplicación web del comercio y aplicación administrativa de Lumen.
- Tipos compartidos.
- POS, caja, inventario, clientes, personal, configuración y analítica.
- Planes y funciones efectivas.
- Organización del frontend por `features`.

La principal limitación está en el modelo actual de `BusinessType` y `BUSINESS_MODULES`: una familia determina una lista rígida de módulos. Además, varios roles y textos están orientados a tienda minorista. Este diseño provocaría combinaciones difíciles de mantener.

## 13. Modelo objetivo de acceso

La disponibilidad de una función deberá evaluarse en capas independientes y en un orden predecible:

```text
Familia
    -> define el modelo operativo y el catálogo amplio de módulos aplicables

Categoría
    -> añade, retira y preconfigura módulos y capacidades para ese negocio

Plan y excepciones comerciales
    -> incluyen o excluyen funciones y establecen límites de uso

Activación por organización o sucursal
    -> permite usar u ocultar lo contratado dentro del ámbito aplicable

Permisos del empleado
    -> determinan qué acciones puede realizar dentro de esos módulos

Canal
    -> determina desde dónde se origina y cómo se presenta la operación
```

Una función estará disponible únicamente cuando atraviese todas las capas aplicables:

```text
función efectiva =
  incluida por familia/categoría o activada como combinación híbrida válida
  + incluida en el plan
  + activa en su ámbito de organización o sucursal
  + permitida para el empleado
```

La navegación, las rutas, las operaciones del servidor y la base de datos deberán usar la misma decisión efectiva. Ocultar el menú no será suficiente.

### 13.1 Organización, suscripción y sucursales

- La **organización** será el límite comercial del cliente y la propietaria de la suscripción.
- El **plan** establecerá cuántas sucursales y otros límites puede utilizar la organización.
- La **sucursal** representará una ubicación u operación concreta dentro de la organización.
- La familia y la categoría se configurarán por sucursal, no globalmente para toda la organización.
- El catálogo, los clientes y la identidad del personal podrán compartirse entre sucursales.
- El inventario, las cajas y los turnos conservarán el contexto de la sucursal donde ocurren.
- Los reportes podrán consultarse por sucursal o consolidados a nivel organización cuando el plan lo permita.
- Cada módulo declarará su ámbito de activación: organización para capacidades compartidas y sucursal para operación local, como POS, caja, cocina o mesas.

### 13.2 Planes y límites

- Se conserva la estructura existente de tres niveles: `standard`, `pro` y `enterprise`.
- El nivel inicial ofrece solamente las funciones esenciales y límites reducidos.
- El nivel intermedio amplía capacidades, módulos y límites.
- Enterprise habilita todas las funciones relevantes para la familia/categoría y límites superiores.
- Los límites se aplicarán en el servidor y en la base de datos cuando corresponda, no únicamente en la interfaz.
- Entre los límites previstos estarán productos, usuarios, cajas, sucursales y almacenamiento; podrán añadirse otros límites medibles sin cambiar el modelo de familia.
- Las excepciones comerciales deberán ser explícitas y auditables, no condicionales improvisados en la aplicación.

### 13.3 Activación, cambios y reducción de plan

- Lumen controlará qué módulos, capacidades y límites concede la suscripción.
- El propietario podrá activar u ocultar por organización o sucursal aquello que ya esté incluido en su plan.
- Una categoría aplicará valores predeterminados; el propietario podrá recuperar un módulo omitido si el plan lo concede y la combinación es válida.
- Toda activación, excepción o cambio de plan quedará auditado.
- Desactivar un módulo conservará sus datos y permitirá consultar el historial a los roles autorizados, pero bloqueará nuevas operaciones del módulo.
- Al bajar de plan no se eliminarán productos, usuarios, sucursales ni operaciones existentes.
- Si el negocio queda por encima de un límite nuevo, podrá consultar y operar con sus registros existentes, pero no crear más elementos limitados hasta volver a estar dentro del límite o ampliar el plan.
- Las operaciones financieras e históricas permanecerán consultables aunque su módulo deje de estar activo.

## 14. Estrategia para reestructurar sin perder lo existente

### Etapa 0: congelar y describir el comportamiento actual

- Mantener la línea base estable y sus pruebas.
- Inventariar rutas, módulos, permisos, tablas y funciones actuales.
- Clasificar cada elemento como núcleo, módulo transversal, capacidad especializada o deuda temporal.

### Etapa 1: crear el lenguaje modular

- Definir formalmente familias, categorías, módulos, capacidades, planes, canales y permisos.
- Crear una matriz única `familia -> categoría -> módulos/capacidades`.
- Crear una matriz independiente `plan -> funciones incluidas/límites`.
- Combinar ambas matrices mediante una única resolución de acceso efectivo.
- Mantener compatibilidad temporal con los tipos actuales.

### Etapa 2: desacoplar navegación y autorización

- Generar navegación y rutas desde un registro de módulos.
- Comprobar acceso en navegación, rutas, operaciones y base de datos.
- Evitar condicionales de rubro dentro de componentes genéricos.
- Permitir excepciones e híbridos sin bifurcar el código ni invalidar los límites del plan.

### Etapa 3: normalizar el núcleo comercial

- Definir contratos estables para catálogo, productos o servicios, clientes, pedidos, ventas y pagos.
- Representar el canal de origen de cada operación.
- Separar pedido, venta, pago y movimiento de inventario para que no sean el mismo evento.
- Preparar extensiones sin agregar campos especializados a todas las entidades.

### Etapa 4: convertir el comercio minorista actual en la primera familia modular

- Conservar el POS existente como primera implementación funcional.
- Extraer sus capacidades específicas de minimarket a opciones configurables.
- Verificar que las categorías comercio general, ropa, ferretería y tecnología puedan añadir o retirar módulos y capacidades sin bifurcar el código.

### Etapa 5: incorporar una familia a la vez

- Añadir primero los módulos compartidos que falten.
- Desarrollar capacidades especializadas por familia de forma incremental.
- Validar cada nueva familia con un negocio piloto antes de ampliar sus categorías.

### Etapa 6: añadir el canal web

- Crear la interfaz pública segura sobre el núcleo ya estabilizado.
- Conectar una primera página personalizada como piloto.
- Incorporar pedidos online, retiro y delivery sin duplicar catálogo ni administración.

## 15. Primer trabajo recomendado

La reestructuración no debe comenzar rediseñando pantallas ni implementando restaurante. El primer trabajo debe ser una auditoría y clasificación funcional del sistema actual que produzca:

1. Inventario de módulos, rutas, permisos, datos y dependencias existentes.
2. Matriz `núcleo / módulo / capacidad especializada / temporal`.
3. Registro objetivo de módulos y capacidades.
4. Mapeo de compatibilidad desde los tipos y subrubros actuales hacia familias y categorías.
5. Matriz independiente de los planes actuales, sus módulos y todos sus límites.
6. Lista de migraciones pequeñas y reversibles.
7. Pruebas que protejan el comportamiento actual antes de cambiar la selección de módulos.

Después de aprobar esas matrices, la primera modificación de producto será reemplazar progresivamente la relación rígida `tipo de negocio -> lista de módulos` por una resolución central `familia + categoría + plan + activación + permisos`, manteniendo el comercio minorista actual funcionando durante toda la transición.

## 16. Restricciones y principios de migración

- No realizar una reescritura masiva.
- Mantener migraciones de datos compatibles y reversibles cuando sea razonable.
- Introducir contratos y adaptadores antes de mover funciones existentes.
- Proteger cada cambio con pruebas del comportamiento actual y del nuevo comportamiento.
- No mezclar el rediseño visual con la primera reestructuración del dominio.
- No activar módulos incompletos para clientes reales.
- No considerar ocultar una opción de menú como control de seguridad suficiente.

## 17. Criterios de aceptación de la arquitectura

La arquitectura modular estará correctamente establecida cuando:

- Una categoría pueda añadir o retirar módulos respecto de la base de su familia.
- Dos tiendas de la misma familia puedan tener categorías y módulos efectivos diferentes.
- Los tres planes controlen tanto funciones visibles como límites aplicados realmente.
- Enterprise muestre todo lo relevante para la categoría sin incorporar módulos ajenos.
- Un negocio híbrido pueda combinar capacidades sin crear un nuevo `BusinessType`.
- Los empleados solo puedan ejecutar acciones permitidas.
- El POS actual continúe operando durante la migración.
- Una página personalizada pueda crear pedidos sin acceso privilegiado a la base de datos.
- Todos los canales utilicen el mismo catálogo, clientes y núcleo de pedidos.
- Añadir una nueva categoría no requiera modificar componentes genéricos.

## 18. Decisiones posteriores pendientes

Estas decisiones no bloquean la definición modular, pero deberán resolverse antes de implementar los módulos relacionados:

- Familia piloto después de comercio minorista.
- Estados exactos de pedidos por canal.
- Momento de reserva y descuento de inventario.
- Valores finales de todos los límites por plan y política de excepciones comerciales.
- Alcance fiscal y tipos de comprobante por país.
- Estrategia de dominios personalizados para páginas públicas.
- Nivel de operación offline requerido por cada módulo.

