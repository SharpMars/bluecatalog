export default function LoggedOut() {
  return (
    <section>
      <div class="h-screen-md max-h-[calc(100vh-4rem)] flex flex-col justify-center items-center">
        <h1 class="text-[clamp(16px,15vw,4rem)] font-bold">
          <span class="text-blue-500">Blue</span>
          <span class="text-yellow-500">Catalog</span>
        </h1>
        <p class="text-[clamp(8px,7vw,2rem)] text-center light:text-black dark:text-white">
          Search through your
          <br /> likes and bookmarks <b>easily</b>
        </p>
        <button
          onClick={() => document.getElementById("login").click()}
          class="light:bg-sky-500 light:hover:bg-sky-400 dark:bg-sky-600 dark:hover:bg-sky-500 text-white p-2 rounded m-t-4 w-48 transition-ease-linear transition-all transition-100"
        >
          Login
        </button>
      </div>
    </section>
  );
}
