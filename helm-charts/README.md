# 🚀 Kubernetes ConfigMap - Calendar Morocco

## 📋 Opciones de Despliegue

### 🎯 **Opción 1: ConfigMap Estándar (RECOMENDADO)**

**Archivo**: `helm-charts/configmap.yaml`

```bash
# Aplicar directamente en Kubernetes
kubectl apply -f helm-charts/configmap.yaml

# Verificar que se creó
kubectl get configmap calendar-morocco-config

# Ver el contenido
kubectl describe configmap calendar-morocco-config
```

✅ **Ventajas**:
- Funciona inmediatamente
- No requiere Helm instalado
- Fácil de editar y aplicar
- Compatible con cualquier cluster Kubernetes

### 🎡 **Opción 2: Helm Chart Completo**

**Archivo**: `helm-charts/templates/configmap.yaml`

```bash
# Instalar con Helm
helm install calendar-morocco ./helm-charts

# Upgrade del ConfigMap
helm upgrade calendar-morocco ./helm-charts

# Ver valores
helm get values calendar-morocco
```

✅ **Ventajas**:
- Configuración dinámica con values.yaml
- Gestión completa del ciclo de vida
- Templates reutilizables
- Rollbacks automáticos

---

## 🔧 **Solución al Error Original**

### ❌ **Problema**:
```yaml
# ESTO DABA ERROR porque faltaban los templates de Helm
name: {{ include "calendar-app.fullname" . }}-config
labels: {{- include "calendar-app.labels" . | nindent 4 }}
```

### ✅ **Solución Aplicada**:

1. **Creé Chart.yaml** con metadatos del chart
2. **Creé _helpers.tpl** con funciones de template necesarias
3. **Convertí a ConfigMap estándar** para uso inmediato

---

## 📁 **Estructura Final**

```
helm-charts/
├── Chart.yaml                    # Metadatos del Helm Chart
├── values.yaml                   # Valores por defecto
├── configmap.yaml               # ✅ ConfigMap estándar (USAR ESTE)
└── templates/
    ├── _helpers.tpl             # Funciones de template Helm
    └── configmap.yaml           # ConfigMap con templates Helm
```

---

## 🚀 **Comandos de Despliegue**

### **Para Desarrollo (Rápido)**:
```bash
# Aplicar ConfigMap estándar
kubectl apply -f helm-charts/configmap.yaml

# Restart pods para cargar nueva config
kubectl rollout restart deployment/calendar-backend
```

### **Para Producción (Con Helm)**:
```bash
# Instalar chart completo
helm install calendar-morocco ./helm-charts

# Actualizar solo la configuración
helm upgrade calendar-morocco ./helm-charts --set config.botolaD1.value="new-value"
```

---

## 💡 **Recomendación**

**Usa el ConfigMap estándar** (`helm-charts/configmap.yaml`) para:
- ✅ Desarrollo local
- ✅ Testing rápido
- ✅ Despliegues simples

**Usa Helm Chart** (`helm-charts/templates/`) para:
- 🎯 Producción
- 🎯 Múltiples entornos
- 🎯 Configuraciones complejas

---

*Problema resuelto: El error era por sintaxis Helm sin Chart completo. Ahora tienes ambas opciones funcionando.* ✅
