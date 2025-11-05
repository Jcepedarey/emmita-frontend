import React, { createContext, useContext, useState } from "react";

const NavigationContext = createContext();

export const NavigationProvider = ({ children }) => {
  const [moduleStates, setModuleStates] = useState({});

  const saveModuleState = (route, state) => {
    setModuleStates((prev) => ({ ...prev, [route]: state }));
  };

  const getModuleState = (route) => {
    return moduleStates[route] || null;
  };

  const clearAllStates = () => {
    setModuleStates({});
  };

  return (
    <NavigationContext.Provider
      value={{ saveModuleState, getModuleState, clearAllStates }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigationState = () => useContext(NavigationContext);
