export const SUPPORTED_LANGUAGES = {
  en: { name: "English", nativeName: "English" },
  es: { name: "Spanish", nativeName: "Español" },
  zh: { name: "Chinese", nativeName: "中文" },
  hi: { name: "Hindi", nativeName: "हिन्दी" },
  fr: { name: "French", nativeName: "Français" },
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// Basic translations for UI elements
export const translations = {
  en: {
    greeting: {
      morning: "Good Morning",
      afternoon: "Good Afternoon", 
      evening: "Good Evening"
    },
    navigation: {
      home: "Home",
      todos: "Todos",
      notes: "Notes",
      settings: "Settings"
    },
    common: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      add: "Add",
      loading: "Loading...",
      error: "Error",
      success: "Success"
    },
    todos: {
      title: "Todos",
      addTodo: "Add Todo",
      completed: "Completed",
      upcoming: "Upcoming",
      today: "Today",
      tomorrow: "Tomorrow",
      priority: "Priority",
      dueDate: "Due Date",
      reminder: "Reminder"
    },
    settings: {
      title: "Settings",
      language: "Language",
      autoDetectLanguage: "Auto-detect language in voice",
      darkMode: "Dark Mode",
      emailNotifications: "Email Notifications",
      progressNotificationTime: "Progress Notification Time"
    }
  },
  es: {
    greeting: {
      morning: "Buenos Días",
      afternoon: "Buenas Tardes",
      evening: "Buenas Noches"
    },
    navigation: {
      home: "Inicio",
      todos: "Tareas",
      notes: "Notas", 
      settings: "Configuración"
    },
    common: {
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      edit: "Editar",
      add: "Agregar",
      loading: "Cargando...",
      error: "Error",
      success: "Éxito"
    },
    todos: {
      title: "Tareas",
      addTodo: "Agregar Tarea",
      completed: "Completadas",
      upcoming: "Próximas",
      today: "Hoy",
      tomorrow: "Mañana",
      priority: "Prioridad",
      dueDate: "Fecha Límite",
      reminder: "Recordatorio"
    },
    settings: {
      title: "Configuración",
      language: "Idioma",
      autoDetectLanguage: "Detectar idioma automáticamente en voz",
      darkMode: "Modo Oscuro",
      emailNotifications: "Notificaciones por Email",
      progressNotificationTime: "Hora de Notificación de Progreso"
    }
  },
  zh: {
    greeting: {
      morning: "早上好",
      afternoon: "下午好",
      evening: "晚上好"
    },
    navigation: {
      home: "首页",
      todos: "任务",
      notes: "笔记",
      settings: "设置"
    },
    common: {
      save: "保存",
      cancel: "取消",
      delete: "删除",
      edit: "编辑",
      add: "添加",
      loading: "加载中...",
      error: "错误",
      success: "成功"
    },
    todos: {
      title: "任务",
      addTodo: "添加任务",
      completed: "已完成",
      upcoming: "即将到来",
      today: "今天",
      tomorrow: "明天",
      priority: "优先级",
      dueDate: "截止日期",
      reminder: "提醒"
    },
    settings: {
      title: "设置",
      language: "语言",
      autoDetectLanguage: "语音中自动检测语言",
      darkMode: "深色模式",
      emailNotifications: "邮件通知",
      progressNotificationTime: "进度通知时间"
    }
  },
  hi: {
    greeting: {
      morning: "सुप्रभात",
      afternoon: "नमस्कार",
      evening: "शुभ संध्या"
    },
    navigation: {
      home: "होम",
      todos: "कार्य",
      notes: "नोट्स",
      settings: "सेटिंग्स"
    },
    common: {
      save: "सेव करें",
      cancel: "रद्द करें",
      delete: "हटाएं",
      edit: "संपादित करें",
      add: "जोड़ें",
      loading: "लोड हो रहा है...",
      error: "त्रुटि",
      success: "सफलता"
    },
    todos: {
      title: "कार्य",
      addTodo: "कार्य जोड़ें",
      completed: "पूर्ण",
      upcoming: "आगामी",
      today: "आज",
      tomorrow: "कल",
      priority: "प्राथमिकता",
      dueDate: "नियत तारीख",
      reminder: "रिमाइंडर"
    },
    settings: {
      title: "सेटिंग्स",
      language: "भाषा",
      autoDetectLanguage: "आवाज़ में भाषा का स्वचालित पता लगाना",
      darkMode: "डार्क मोड",
      emailNotifications: "ईमेल सूचनाएं",
      progressNotificationTime: "प्रगति सूचना समय"
    }
  },
  fr: {
    greeting: {
      morning: "Bonjour",
      afternoon: "Bon Après-midi",
      evening: "Bonsoir"
    },
    navigation: {
      home: "Accueil",
      todos: "Tâches",
      notes: "Notes",
      settings: "Paramètres"
    },
    common: {
      save: "Sauvegarder",
      cancel: "Annuler",
      delete: "Supprimer",
      edit: "Modifier",
      add: "Ajouter",
      loading: "Chargement...",
      error: "Erreur",
      success: "Succès"
    },
    todos: {
      title: "Tâches",
      addTodo: "Ajouter une Tâche",
      completed: "Terminées",
      upcoming: "À venir",
      today: "Aujourd'hui",
      tomorrow: "Demain",
      priority: "Priorité",
      dueDate: "Date d'échéance",
      reminder: "Rappel"
    },
    settings: {
      title: "Paramètres",
      language: "Langue",
      autoDetectLanguage: "Détection automatique de la langue vocale",
      darkMode: "Mode Sombre",
      emailNotifications: "Notifications Email",
      progressNotificationTime: "Heure de Notification de Progrès"
    }
  }
} as const;

export function getTranslation(language: SupportedLanguage, key: string): string {
  const keys = key.split('.');
  let value: any = translations[language];
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  return value || key;
}