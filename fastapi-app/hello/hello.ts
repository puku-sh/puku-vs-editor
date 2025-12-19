  interface User {
      id: number;
      name: string;
      email: string;
      age: number;
  }

  export function processUsers(users: User[]): void {
      // TODO: Calculate total age, average age
      let totalAge = 0;
      let averageAge = 0;

      for (const user of users) {
          totalAge += user.age;
      }

      averageAge = totalAge / users.length;

      console.log(`Total Age: ${totalAge}`);
      console.log(`Average Age: ${averageAge}`);
  }
  