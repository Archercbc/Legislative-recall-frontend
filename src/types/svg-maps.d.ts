declare module '@svg-maps/taiwan' {
    interface Location {
      id: string;
      name: string;
      path: string;
    }
  
    interface Map {
      label: string;
      viewBox: string;
      locations: Location[];
    }
  
    const taiwan: Map;
    export default taiwan;
  }
      