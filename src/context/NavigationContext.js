import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

const NavigationContext = createContext();

export const NavigationProvider = ({ children }) => {
  // ✅ Cargar estados desde localStorage al iniciar
  const [moduleStates, setModuleStates] = useState(() => {
    try {
      const saved = localStorage.getItem("swalquiler_module_states");
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error("Error cargando estados guardados:", error);
      return {};
    }
  });

  // ✅ Usar ref para el timeout
  const saveTimeoutRef = useRef(null);
  
  // ✅ Usar ref para prevenir actualizaciones durante guardado
  const isSavingRef = useRef(false);

  // ✅ Guardar en localStorage cuando cambien los estados
  useEffect(() => {
    if (isSavingRef.current) return; // No guardar si ya estamos guardando

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem("swalquiler_module_states", JSON.stringify(moduleStates));
      } catch (error) {
        console.error("Error guardando estados:", error);
      }
    }, 300);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [moduleStates]);

  // ✅ NUEVA IMPLEMENTACIÓN: usar useCallback para estabilizar la función
  const saveModuleState = useCallback((route, state) => {
    // Prevenir llamadas mientras guardamos
    if (isSavingRef.current) return;
    
    isSavingRef.current = true;

    setModuleStates((prev) => {
      // Comparar por valor, no por referencia
      const prevState = prev[route];
      
      // Si no hay estado previo, guardar
      if (!prevState) {
        isSavingRef.current = false;
        return {
          ...prev,
          [route]: {
            ...state,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Comparar excluyendo timestamp
      const { timestamp: prevTs, ...prevData } = prevState;
      const prevString = JSON.stringify(prevData);
      const newString = JSON.stringify(state);
      
      // Si son iguales, no actualizar
      if (prevString === newString) {
        isSavingRef.current = false;
        return prev;
      }

      // Actualizar solo si cambió
      isSavingRef.current = false;
      return {
        ...prev,
        [route]: {
          ...state,
          timestamp: new Date().toISOString()
        }
      };
    });
  }, []); // ✅ Array vacío - la función nunca cambia

  const getModuleState = useCallback((route) => {
    return moduleStates[route] || null;
  }, [moduleStates]);

  const clearAllStates = useCallback(() => {
    setModuleStates({});
    localStorage.removeItem("swalquiler_module_states");
  }, []);

  const clearModuleState = useCallback((route) => {
    setModuleStates((prev) => {
      const newStates = { ...prev };
      delete newStates[route];
      return newStates;
    });
  }, []);

  return (
    <NavigationContext.Provider
      value={{ 
        saveModuleState, 
        getModuleState, 
        clearAllStates,
        clearModuleState
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigationState = () => useContext(NavigationContext);