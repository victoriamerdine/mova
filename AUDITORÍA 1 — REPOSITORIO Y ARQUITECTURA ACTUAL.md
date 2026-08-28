# AUDITORÍA 1 — REPOSITORIO Y ARQUITECTURA ACTUAL

Quiero que hagas una auditoría técnica completa del repositorio actual.

IMPORTANTE:

- NO modifiques ningún archivo.
- NO instales dependencias.
- NO hagas commits.
- NO crees branches.
- NO migres datos.
- NO refactorices código.
- Solamente analiza y documenta.

El objetivo es entender exactamente qué tenemos hoy antes de comenzar a construir MOVA.

## Analizar

### 1. Stack

Identifica:

- framework frontend;
- lenguaje;
- backend;
- base de datos;
- ORM;
- autenticación;
- almacenamiento;
- sistema de estilos;
- librerías principales;
- testing;
- deployment.

### 2. Estructura

Analiza:

- estructura de carpetas;
- componentes;
- páginas;
- rutas;
- APIs;
- servicios;
- hooks;
- modelos;
- schemas;
- utilidades;
- configuración.

### 3. Base de datos

Determina:

- qué base de datos existe;
- tablas actuales;
- relaciones;
- claves primarias;
- foreign keys;
- índices;
- políticas de acceso;
- migraciones existentes.

Si existe Supabase, analizar también:

- auth;
- RLS;
- storage;
- edge functions;
- migrations.

### 4. Usuarios

Determina cómo están implementados actualmente:

- usuarios;
- roles;
- autenticación;
- autorización;
- permisos.

### 5. Frontend

Analiza:

- sistema de navegación;
- layout;
- componentes reutilizables;
- diseño responsive;
- sistema visual;
- formularios;
- tablas;
- modales;
- manejo de errores;
- estado global.

### 6. Backend

Analiza:

- APIs;
- servicios;
- validaciones;
- manejo de errores;
- acceso a base de datos;
- lógica de negocio.

### 7. Testing

Identifica:

- tests unitarios;
- tests de integración;
- tests E2E;
- cobertura si existe;
- herramientas usadas.

### 8. Deployment

Identifica:

- cómo se ejecuta localmente;
- cómo se construye;
- cómo se despliega;
- variables de entorno necesarias;
- CI/CD si existe.

## Resultado esperado

NO quiero código todavía.

Entregame un informe con:

### A. Arquitectura actual

Explicación clara de cómo funciona actualmente.

### B. Diagrama conceptual

Representar la arquitectura actual en texto.

### C. Componentes reutilizables

Qué podemos aprovechar para MOVA.

### D. Problemas técnicos

Qué problemas o deuda técnica ves.

### E. Riesgos

Qué podría complicar la evolución del proyecto.

### F. Recomendaciones

Qué conservarías y qué cambiarías.

### G. Compatibilidad con MOVA

Evaluá qué tan preparado está el proyecto actual para convertirse en la plataforma descrita en CLAUDE.md.

### H. Información faltante

Lista de cosas que necesitás conocer antes de comenzar a implementar.

No hagas cambios hasta que te dé aprobación.