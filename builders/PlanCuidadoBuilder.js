// Clase PlanCuidadoBuilder: 
// Implementa el patrón de diseño Builder para construir objetos de tipo Plan de Cuidado de forma flexible.
// Permite agregar propiedades paso a paso y valida que el objeto final tenga los campos obligatorios antes de construirlo.

class PlanCuidadoBuilder {
  constructor() {
    // Inicializa un plan de cuidado vacío con un arreglo de visitas vacío.
    this.plan = { visitas: [] };
  }

  // Método para establecer el ID de la mascota asociada al plan.
  // Retorna la instancia actual del builder para permitir el encadenamiento de métodos.
  setIdMascota(idMascota) {
    this.plan.idMascota = idMascota;
    return this;
  }

  // Método para establecer la dieta del plan de cuidado.
  setDieta(dieta) {
    this.plan.dieta = dieta;
    return this;
  }

  // Método para establecer el ejercicio del plan de cuidado.
  setEjercicio(ejercicio) {
    this.plan.ejercicio = ejercicio;
    return this;
  }

  // Método para establecer el correo del dueño de la mascota.
  setCorreoDueno(correoDueno) {
    this.plan.correoDueno = correoDueno;
    return this;
  }

  // Método para establecer el nombre del dueño de la mascota.
  setNombreDueno(nombreDueno) {
    this.plan.nombreDueno = nombreDueno;
    return this;
  }

  // Método para establecer el nombre de la mascota asociada al plan.
  setNombreMascota(nombreMascota) {
    this.plan.nombreMascota = nombreMascota;
    return this;
  }

  // Método para agregar un conjunto de visitas al plan de cuidado.
  // Las visitas son arreglos con información sobre citas específicas.
  setVisitas(visitas) {
    this.plan.visitas = visitas;
    return this;
  }

  // Método para construir y retornar el plan de cuidado final.
  // Valida que todos los campos obligatorios estén presentes antes de construir el objeto.
  build() {
    if (
      !this.plan.idMascota || // Valida que el ID de la mascota esté presente.
      !this.plan.dieta || // Valida que la dieta esté presente.
      !this.plan.ejercicio || // Valida que el ejercicio esté presente.
      !this.plan.correoDueno || // Valida que el correo del dueño esté presente.
      !this.plan.nombreDueno || // Valida que el nombre del dueño esté presente.
      !this.plan.nombreMascota // Valida que el nombre de la mascota esté presente.
    ) {
      // Lanza un error si falta algún campo obligatorio.
      throw new Error('Faltan campos obligatorios para crear un plan de cuidado.');
    }
    // Retorna el objeto construido del plan de cuidado.
    return this.plan;
  }
}

// Exporta la clase PlanCuidadoBuilder para ser usada en otras partes del código.
module.exports = PlanCuidadoBuilder;
