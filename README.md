# El Rey de las Llantas
Versión local terminada · 16 de noviembre de 2026

## Empezar
1. Extrae el ZIP completo.
2. Sirve esta carpeta por HTTP, manteniendo juntas las carpetas js, css e img.
   - En Windows con Python instalado, abre iniciar.bat.
   - Alternativa desde una terminal en esta carpeta: python -m http.server 8000 --bind 127.0.0.1
3. Abre http://localhost:8000/index.html.
4. Entra a http://localhost:8000/admin.html.

Acceso temporal solicitado:
- Correo: eliezer@gmail.com
- Contraseña: 1234

Este es un acceso de demostración en el navegador, no autenticación de servidor.
No necesita Supabase, Node ni instalar dependencias para funcionar.
No abras los HTML con file://: los navegadores no garantizan que las páginas compartan el almacenamiento de ese modo.

## Qué se terminó
- Diseño en azul, amarillo y blanco, con portada fotográfica y catálogo centrado en llantas.
- Cuatro fondos incluidos. Fondo 4 como portada inicial; selección persistente desde Ajustes.
- El catálogo carga la foto suministrada de **Falken WILDPEAK AT4/W 35x12.50R17LT 125R**.
- Eliminadas las fichas y fotos antiguas de **Wildpeak A/T** y **Dueler H/T**.
- Cada medida e índice tiene un registro propio, con foto y especificaciones independientes.
- Las otras 18 variantes del ZIP original se conservaron como borradores, porque eran datos de ejemplo. Publícalas cuando hayas confirmado sus datos.
- Administrador para crear, editar, duplicar como otra variante, publicar, ocultar y eliminar llantas; también para editar referencias y fotos de vehículos.
- Lectura sugerida del nombre del archivo, fotos reducidas a un máximo de 1000 px y guardado local.
- Pedido de varias variantes con cantidades, nombre, vehículo, comentarios y mensaje preparado para WhatsApp.
- Exportación/importación de respaldo y exportación de js/data.js.
- Búsqueda por marca/modelo/medida y filtro por tipo de uso.

## WhatsApp pendiente
El ZIP original no tenía un número real del negocio. No se envían pedidos a un número inventado.
En Administración → Ajustes y fondos, ingresa el número con código de país y guarda.
Mientras esté vacío, el pedido se puede preparar y copiar; “Abrir WhatsApp” permanece desactivado.
Al configurarlo, abre una conversación con el mensaje. El usuario debe enviarlo desde WhatsApp; la web no confirma envío, venta ni pago.

## Agregar una variante
1. Administración → Llantas → Nueva variante.
2. Sube la foto. Ejemplo: Falken WILDPEAK AT4-W 35x12,50R17LT 125R.png.
3. Revisa los campos detectados: AT4-W pasa a AT4/W; 12,50 a 12.50.
   Las medidas métricas en nombres como 265-65R17 también se reconocen.
4. Completa uso y datos de la ficha exacta. Cada especificación adicional va en una línea, con formato Nombre | Valor.
5. Marca “Mostrar esta variante en el catálogo” y guarda.

“Crear variante” conserva la marca/modelo/uso, pero pide nueva medida, índices y foto; vacía la ficha técnica para no atribuirle datos de otra llanta.
No permite duplicar la misma combinación de marca, modelo, medida, carga y velocidad.
Precio y disponibilidad se consultan, no se inventan.
La ficha inicial de Falken incluye únicamente la información suministrada en el nombre de la imagen; no presupone presión, peso, garantía ni otros valores.

## Vehículos y compatibilidad
Los vehículos heredados son referencias orientativas sin año ni versión verificados.
El filtro compara medidas, no garantiza compatibilidad.
La Falken de 35 pulgadas NO está vinculada automáticamente a Hilux. Las medidas de referencia heredadas de Hilux son 265/65R17 y 265/60R18.
Valida cualquier relación con la etiqueta/manual del vehículo, versión, rin e índices antes de ofrecerla como compatible.
Puedes editar o eliminar estas referencias desde Administración → Vehículos.

## Dónde quedan los cambios
Los cambios se guardan en localStorage bajo la clave rey-llantas.catalog.v2.
Las páginas públicas y el administrador deben abrirse en el mismo navegador y origen: mismo protocolo, dominio y puerto.
No se sincronizan con otros dispositivos ni modifican los archivos originales automáticamente.
No uses navegación privada para administrar. Borrar los datos del navegador elimina la copia local.
El guardado avisa si no queda espacio; no muestra éxito si el almacenamiento falló.
Una edición en otra pestaña del administrador bloquea el guardado de la copia antigua hasta recargar, para evitar sobreescribir cambios.

## Respaldos y publicación manual
- “Exportar respaldo JSON” conserva fichas, fotos cargadas, vehículos y ajustes.
- “Restaurar un respaldo” valida el archivo y pide confirmar antes de reemplazar los datos.
- “Exportar catálogo para web” descarga data.js. Reemplaza js/data.js en el proyecto y vuelve a subir la carpeta a tu alojamiento estático.
- Las imágenes cargadas desde el administrador se incluyen en los respaldos y en el archivo exportado.
- Los datos iniciales incluyen rutas relativas a las imágenes que vienen en este ZIP: conserva la carpeta img.
- El archivo exportado incluye borradores. No guardes información privada en estas fichas.
- Un navegador que ya tenga cambios locales mantiene su copia; para actualizarlo importa el respaldo correspondiente.
- La web puede alojarse como HTML estático, sin build. Para administrar un catálogo compartido en tiempo real falta la integración de servidor.

## Supabase después
Esta versión no se conecta a Supabase. Se quitaron las peticiones que usaban el correo como URL.
supabase.sql es únicamente una propuesta de estructura para un proyecto nuevo; no es una migración del esquema anterior y no necesitas ejecutarlo ahora.
La integración futura requiere autenticación real, permisos de administrador, subida de imágenes y adaptación de la capa de datos. Cambiar una URL no basta.
No publiques este acceso temporal como si protegiera información privada o modificaciones de servidor.

## Archivos
- index.html / js/app.js: catálogo, búsqueda, fichas, pedido y fondos.
- admin.html / js/admin.js: administrador local.
- js/store.js: validación, persistencia, fotos y exportación.
- js/data.js: catálogo y ajustes iniciales.
- js/config.js: acceso temporal.
- css/: estilos de tienda y administrador.
- img/: fotos suministradas y foto de Hilux heredada del proyecto.
- tests/verify.cjs: prueba local de lógica, sin dependencias. Se ejecuta con node tests/verify.cjs si tienes Node.

## Verificación
Se revisaron en navegador la portada, la ficha exacta, filtros por vehículo, pedido, actualización de cantidades y persistencia del pedido.
Las pruebas de lógica cubren el acceso temporal, altas/edición/variantes/eliminación, referencias de vehículos, validación de medidas, ajustes, exportación, errores de almacenamiento y conflictos entre pestañas.
No se envió ningún mensaje real ni se conectó Supabase.

## Marcas de llantas (carrusel)
- Se administran en Administración → Marcas: crear, editar, subir logo, ordenar con ↑ ↓ y eliminar.
- Sin logo se muestra el nombre de la marca en texto. El carrusel no se puede pausar ni mover con el mouse o el dedo.
- Si el sistema del visitante tiene activada la opción de reducir movimiento, las marcas se muestran fijas.
- El carrusel va después de la sección destacada de la Falken. Si la lista queda vacía, la sección se oculta.

## Preparar fotos de vehículos (script)
1. Instala Pillow una vez: `pip install pillow`
2. Copia las fotos descargadas a `tools/entrada/` (nombre sugerido: `Marca Modelo Año.png`).
3. Si un carro mira a la derecha, agrega " der" al final del nombre (`Toyota Hilux 2017 der.png`) o usa `--voltear hilux`.
4. Ejecuta: `python tools/procesar_vehiculos.py`
5. Quedan en `img/vehiculos/`, recortadas, del mismo tamaño (800x400), con la trompa a la izquierda y nombre limpio.
6. Para un vehículo nuevo, enlaza la foto en `js/data.js` (`image: 'img/vehiculos/nombre.png'`) o súbela desde Administración → Vehículos.

## Portada (hero)
- Las fotos de `img/fondos/fondo1.jpg` a `fondo4.jpg` cambian solas cada 6.5 segundos con un fundido suave. Los botones 01–04 saltan a una foto y reinician el conteo.
- No se configura desde Administración. Para usar otras fotos, reemplaza esos archivos (misma ruta y nombre, JPG horizontal de unos 1920 px).
- Si el sistema del visitante reduce el movimiento, la portada queda fija.

## Fichas de muestra de llantas
- Las 12 fotos de llantas se repiten por cada medida apta para los vehículos del buscador (45 fichas, más la Falken 35x12.50R17LT). Cada ficha tiene su propio archivo en `img/llantas/` con nombre `marca-modelo-medida[-indices].webp`.
- Solo las medidas que vienen en el nombre original de la foto llevan índices de carga y velocidad. Las demás quedan sin índices hasta confirmar la ficha real.
- Para poner la foto real de una variante, sube la foto desde Administración → Llantas → Editar, o reemplaza el archivo con el mismo nombre.
- Las medidas de los vehículos (`js/data.js`) son orientativas; confírmalas con la etiqueta del marco de la puerta.

## Por qué un navegador podía no ver el catálogo nuevo (y cómo se resolvió)
- El administrador guarda una copia del catálogo en el navegador, y esa copia tenía prioridad sobre `js/data.js`. Un navegador con una copia vieja nunca veía las fichas nuevas del proyecto.
- Ahora `js/data.js` trae un valor `revision`. Cuando cambia, el navegador adopta el catálogo nuevo y guarda la copia anterior (Administración → Respaldos → "Descargar copia anterior").
- Cuando tengas el catálogo real del cliente: exporta con "Exportar catálogo para web" (el archivo ya trae una revisión nueva) y reemplaza `js/data.js`. Así todos los navegadores se actualizan solos.

## Catálogo: filas, "Ver más" y filtros
- Muestra 4 filas (12 llantas en escritorio, 8 en tablet, 4 en celular). "Ver más llantas" suma otras 4 filas; al mostrar todo, el botón pasa a "Ver menos". Cualquier filtro vuelve a las 4 filas.
- Filtros: búsqueda (acepta marca, modelo o medida), uso, rin, marca y vehículo. "Limpiar filtros" aparece cuando hay alguno activo.
- Marca: los botones salen de las marcas de las llantas publicadas y siguen el orden de Administración → Marcas. Si la marca tiene logo allí (el nombre debe coincidir con el de la llanta), el botón muestra el logo; si no, el nombre.
