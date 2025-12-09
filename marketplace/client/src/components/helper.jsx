import React, { useEffect } from "react";
import "./Helper.css"; // Asegúrate de tener este archivo de estilos

const Helper = ({ message }) => {
  useEffect(() => {
    const robotWrapper = document.getElementById("robotWrapper");

    const greet = () => {
      robotWrapper.classList.add("waving");
      setTimeout(() => {
        robotWrapper.classList.remove("waving");
      }, 2000); // La animación dura 2 segundos
    };

    setTimeout(greet, 1000); // Saludo inicial después de 1 segundo
    const intervalId = setInterval(greet, 5000); // Saludo cada 5 segundos

    return () => {
      clearInterval(intervalId); // Limpiar el intervalo cuando el componente se desmonte
    };
  }, []);

  return (
    <div className="robot-wrapper" id="robotWrapper">
      <div className="speech-bubble">{message}</div> {/* Mostrar el mensaje dinámico */}
      <div className="robot">
        <div className="robot-head">
          <div className="robot-antenna">
            <div className="robot-antenna-ball"></div>
          </div>
          <div className="robot-eye left">
            <div className="robot-eye-pupil"></div>
          </div>
          <div className="robot-eye right">
            <div className="robot-eye-pupil"></div>
          </div>
          <div className="robot-mouth"></div>
        </div>
        <div className="robot-body"></div>
        <div className="robot-arm left"></div>
        <div className="robot-arm right"></div>
      </div>
    </div>
  );
};

export default Helper;
