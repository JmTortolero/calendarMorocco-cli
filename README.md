# Calendar Morocco CLI

Una aplicación web completa para gestionar eventos y festividades marroquíes, construida con Spring Boot (backend) y Angular (frontend).

![Calendar Morocco Screenshot](https://github.com/user-attachments/assets/5a743881-35ea-4c6a-b0f9-70d720f8f0de)

## Características

- 📅 **Gestión completa de eventos** - Crear, editar, eliminar y visualizar eventos
- 🔍 **Búsqueda avanzada** - Buscar eventos por título o descripción
- 🏷️ **Filtrado por categorías** - Filtrar eventos por tipo (Personal, Trabajo, Festivo, Religioso, Cultural)
- 🎨 **Interfaz moderna** - Diseño responsive con colores distintivos para cada tipo de evento
- 🇲🇦 **Enfoque marroquí** - Incluye eventos culturales y religiosos relevantes para Marruecos
- 🌐 **API REST completa** - Backend con endpoints para todas las operaciones CRUD

## Tecnologías utilizadas

### Backend (Spring Boot)
- Spring Boot 3.2.0
- Spring Data JPA
- H2 Database (en memoria)
- Maven
- Java 17

### Frontend (Angular)
- Angular 18+
- TypeScript
- CSS3 con diseño responsive
- HTTP Client para consumir APIs

## Estructura del proyecto

```
calendarMorocco-cli/
├── src/main/java/com/jmtortolero/calendarmorocco/
│   ├── CalendarMoroccoApplication.java
│   ├── config/DataInitializer.java
│   ├── controller/CalendarEventController.java
│   ├── model/CalendarEvent.java
│   └── repository/CalendarEventRepository.java
├── src/main/resources/
│   └── application.properties
├── frontend/
│   ├── src/app/
│   │   ├── components/
│   │   │   ├── calendar/
│   │   │   └── event-form/
│   │   ├── models/calendar-event.ts
│   │   └── services/calendar.ts
│   └── package.json
├── pom.xml
└── README.md
```

## Instalación y configuración

### Prerrequisitos

- Java 17 o superior
- Node.js 18+ y npm
- Maven 3.6+

### 1. Clonar el repositorio

```bash
git clone https://github.com/JmTortolero/calendarMorocco-cli.git
cd calendarMorocco-cli
```

### 2. Configurar y ejecutar el backend

```bash
# Compilar el proyecto
mvn clean compile

# Ejecutar la aplicación Spring Boot
mvn spring-boot:run
```

El backend estará disponible en `http://localhost:8080`

### 3. Configurar y ejecutar el frontend

```bash
# Navegar al directorio frontend
cd frontend

# Instalar dependencias
npm install

# Ejecutar la aplicación Angular
ng serve
```

El frontend estará disponible en `http://localhost:4200`

## Uso de la aplicación

### Visualizar eventos
- La página principal muestra todos los eventos en tarjetas coloridas
- Cada tipo de evento tiene un color distintivo:
  - 🔵 Trabajo (azul)
  - 🟢 Personal (verde)
  - 🔴 Festivo (rojo)
  - 🟣 Religioso (morado)
  - 🟠 Cultural (naranja)

### Crear un nuevo evento
1. Haz clic en el botón "➕ Nuevo Evento"
2. Completa el formulario con los detalles del evento
3. Selecciona el tipo de evento apropiado
4. Haz clic en "Crear Evento"

### Buscar eventos
- Utiliza la barra de búsqueda para encontrar eventos por título o descripción
- Haz clic en 🔍 o presiona Enter para buscar

### Filtrar eventos
- Utiliza el menú desplegable "Todos los tipos" para filtrar por categoría
- Selecciona un tipo específico para ver solo esos eventos

### Editar eventos
- Haz clic en el botón "✏️ Editar" en cualquier evento
- Modifica los campos necesarios en el formulario
- Haz clic en "Actualizar Evento"

### Eliminar eventos
- Haz clic en el botón "🗑️ Eliminar" en cualquier evento
- Confirma la eliminación en el diálogo

## API Endpoints

El backend proporciona los siguientes endpoints REST:

- `GET /api/events` - Obtener todos los eventos
- `GET /api/events/{id}` - Obtener un evento específico
- `POST /api/events` - Crear un nuevo evento
- `PUT /api/events/{id}` - Actualizar un evento existente
- `DELETE /api/events/{id}` - Eliminar un evento
- `GET /api/events/search?keyword={keyword}` - Buscar eventos
- `GET /api/events/type/{eventType}` - Filtrar por tipo de evento
- `GET /api/events/date-range?startDate={start}&endDate={end}` - Filtrar por rango de fechas

## Datos de ejemplo

La aplicación incluye eventos de ejemplo:
- Ramadan (Religioso)
- Día de la Independencia de Marruecos (Cultural)
- Año Nuevo (Festivo)
- Reunión de equipo (Trabajo)

## Desarrollo

Para contribuir al proyecto:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Haz commit de tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## Autor

**JmTortolero** - [GitHub](https://github.com/JmTortolero)
