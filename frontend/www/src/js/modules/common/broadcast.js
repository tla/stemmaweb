// Class for simple event notification.
//
//   //Example usage:
//   const bus = new PubSub();
//  
//   const unsubscribe = bus.subscribe("greet", (name) => {
//     console.log(`Hello, ${name}!`);
//   });
//  
//   bus.publish("greet", "Alice"); // "Hello, Alice!"
//  
//   unsubscribe();
//   bus.publish("greet", "Bob");


class Broadcast {

    constructor() {
      this.events = {};
    }
  
    // Subscribe to an event
    subscribe( event, callback ) {
      if ( !this.events[event] ) {
        this.events[event] = [];
      }

      this.events[event].push( callback );
  
      // Return unsubscribe function
      return () => this.unsubscribe( event, callback );
    }
  
    // Unsubscribe from an event
    unsubscribe( event, callback ) {
      if ( !this.events[event] ) return;
      this.events[event] = this.events[event].filter(cb => cb !== callback);
  
      // Clean up if no subscribers left
      if ( this.events[event].length === 0 ) {
        delete this.events[event];
      }
    }
  
    // Publish (emit) an event
    publish( event, eventData ) {
      if (!this.events[event]) return;
      this.events[event].forEach( callback => callback( eventData ) );
    }
  }
  
const broadcast = new Broadcast();