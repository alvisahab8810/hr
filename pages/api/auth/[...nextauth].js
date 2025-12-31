


// // pages/api/auth/[...nextauth].js
// import NextAuth from "next-auth";
// import CredentialsProvider from "next-auth/providers/credentials";
// import dbConnect from "@/utils/dbConnect";
// import User from "@/models/User";

// export default NextAuth({
//   session: { strategy: "jwt" },
//   providers: [
//     CredentialsProvider({
//       name: "Credentials",
//       credentials: {
//         email: { label: "Email", type: "text" },
//         password: { label: "Password", type: "password" },
//       },
//       async authorize({ email, password }) {
//         await dbConnect();
//         const user = await User.findOne({ email });
//         if (!user) return null;

//         const ok = await user.matchPassword(password);
//         if (!ok) return null;

//         /* what gets encoded into the JWT on first login */
//         return {
//           id: user._id.toString(),         // ← keep as string
//           name: user.name,
//           email: user.email,
//           role: user.role,
//         };
//       },
//     }),
//   ],
//   callbacks: {
//     async jwt({ token, user }) {
//       /* first time: copy fresh user data into the token */
//       if (user) {
//         token.id = user.id;               // ← add this
//         token.role = user.role;
//       }
//       return token;
//     },
//     async session({ session, token }) {
//       /* expose token data to the client */
//       session.user.id = token.id;         // ← add this
//       session.user.role = token.role;
//       return session;
//     },
//   },
//   secret: process.env.NEXTAUTH_SECRET,     // make sure it exists in .env.local
// });








import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/utils/dbConnect";
import User from "@/models/User";

export const authOptions = {
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize({ email, password }) {
        await dbConnect();

        const user = await User.findOne({ email });
        if (!user) return null;

        const ok = await user.matchPassword(password);
        if (!ok) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);

