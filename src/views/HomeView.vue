<!-- <script setup>
import { computed } from "vue"
import { useNow } from "@vueuse/core"
import { useRouter } from "vue-router"

const router = useRouter()

/*
====================================================
REAL-TIME CLOCK
====================================================

Checks the user's local time once per minute.
*/

const now = useNow({
  interval: 60000
})

/*
Convert current time into decimal hours.

Examples:

4:30 PM = 16.5
6:45 PM = 18.75
*/

const currentHour = computed(() => {
  return (
    now.value.getHours() +
    now.value.getMinutes() / 60
  )
})

/*
====================================================
BACKGROUND IMAGES
====================================================
*/

const backgrounds = {
  day: "/backgrounds/day.png",
  afternoon: "/backgrounds/afternoon.png",
  sunset: "/backgrounds/sunset.png",
  dusk: "/backgrounds/dusk.png",
  evening: "/backgrounds/evening.png",
  night: "/backgrounds/night.png"
}

/*
====================================================
HELPER FUNCTION
====================================================

Converts the current position inside a transition
into a value between 0 and 1.

Example:

16:00 = 0
16:30 = 0.5
17:00 = 1
*/

function getProgress(start, end, time) {
  const progress =
    (time - start) /
    (end - start)

  return Math.min(
    Math.max(progress, 0),
    1
  )
}

/*
====================================================
TIME-OF-DAY SYSTEM
====================================================

TIMELINE:

00:00 - 05:30    NIGHT

05:30 - 07:00    NIGHT → DAY

07:00 - 11:00    DAY

11:00 - 12:00    DAY → AFTERNOON

12:00 - 16:00    AFTERNOON

16:00 - 17:00    AFTERNOON → SUNSET

17:00 - 18:00    SUNSET

18:00 - 18:45    SUNSET → DUSK

18:45 - 19:30    DUSK

19:30 - 20:00    DUSK → EVENING

20:00 - 21:30    EVENING

21:30 - 22:30    EVENING → NIGHT

22:30 onwards    NIGHT
*/

const scene = computed(() => {

  const hour = currentHour.value

  /*
  ================================================
  NIGHT
  ================================================
  */

  if (
    hour >= 22.5 ||
    hour < 5.5
  ) {
    return {
      current: "night",
      next: "night",
      progress: 0
    }
  }

  /*
  ================================================
  NIGHT → DAY
  5:30 AM - 7:00 AM
  ================================================
  */

  if (
    hour >= 5.5 &&
    hour < 7
  ) {
    return {
      current: "night",
      next: "day",

      progress:
        getProgress(
          5.5,
          7,
          hour
        )
    }
  }

  /*
  ================================================
  DAY
  7:00 AM - 11:00 AM
  ================================================
  */

  if (
    hour >= 7 &&
    hour < 11
  ) {
    return {
      current: "day",
      next: "day",
      progress: 0
    }
  }

  /*
  ================================================
  DAY → AFTERNOON
  11:00 AM - 12:00 PM
  ================================================
  */

  if (
    hour >= 11 &&
    hour < 12
  ) {
    return {
      current: "day",
      next: "afternoon",

      progress:
        getProgress(
          11,
          12,
          hour
        )
    }
  }

  /*
  ================================================
  AFTERNOON
  12:00 PM - 4:00 PM
  ================================================
  */

  if (
    hour >= 12 &&
    hour < 16
  ) {
    return {
      current: "afternoon",
      next: "afternoon",
      progress: 0
    }
  }

  /*
  ================================================
  AFTERNOON → SUNSET
  4:00 PM - 5:00 PM
  ================================================
  */

  if (
    hour >= 16 &&
    hour < 17
  ) {
    return {
      current: "afternoon",
      next: "sunset",

      progress:
        getProgress(
          16,
          17,
          hour
        )
    }
  }

  /*
  ================================================
  SUNSET
  5:00 PM - 6:00 PM
  ================================================
  */

  if (
    hour >= 17 &&
    hour < 18
  ) {
    return {
      current: "sunset",
      next: "sunset",
      progress: 0
    }
  }

  /*
  ================================================
  SUNSET → DUSK
  6:00 PM - 6:45 PM
  ================================================
  */

  if (
    hour >= 18 &&
    hour < 18.75
  ) {
    return {
      current: "sunset",
      next: "dusk",

      progress:
        getProgress(
          18,
          18.75,
          hour
        )
    }
  }

  /*
  ================================================
  DUSK
  6:45 PM - 7:30 PM
  ================================================
  */

  if (
    hour >= 18.75 &&
    hour < 19.5
  ) {
    return {
      current: "dusk",
      next: "dusk",
      progress: 0
    }
  }

  /*
  ================================================
  DUSK → EVENING
  7:30 PM - 8:00 PM
  ================================================
  */

  if (
    hour >= 19.5 &&
    hour < 20
  ) {
    return {
      current: "dusk",
      next: "evening",

      progress:
        getProgress(
          19.5,
          20,
          hour
        )
    }
  }

  /*
  ================================================
  EVENING
  8:00 PM - 9:30 PM
  ================================================
  */

  if (
    hour >= 20 &&
    hour < 21.5
  ) {
    return {
      current: "evening",
      next: "evening",
      progress: 0
    }
  }

  /*
  ================================================
  EVENING → NIGHT
  9:30 PM - 10:30 PM
  ================================================
  */

  if (
    hour >= 21.5 &&
    hour < 22.5
  ) {
    return {
      current: "evening",
      next: "night",

      progress:
        getProgress(
          21.5,
          22.5,
          hour
        )
    }
  }

  /*
  Safety fallback
  */

  return {
    current: "day",
    next: "day",
    progress: 0
  }
})

/*
====================================================
CURRENT BACKGROUND
====================================================
*/

const currentBackground = computed(() => {
  return backgrounds[
    scene.value.current
  ]
})

/*
====================================================
NEXT BACKGROUND
====================================================
*/

const nextBackground = computed(() => {
  return backgrounds[
    scene.value.next
  ]
})

/*
====================================================
NEXT IMAGE OPACITY
====================================================

0 = invisible
1 = completely visible
*/

const nextOpacity = computed(() => {
  return scene.value.progress
})
</script> -->

<script setup>
import { computed } from "vue"
import { useNow } from "@vueuse/core"
import { useRouter } from "vue-router"

const router = useRouter()

/*
====================================================
TESTING MODE
====================================================

true  = entire 24-hour cycle happens quickly
false = uses the user's actual real-world time
*/

const TEST_MODE = true

/*
How long one full 24-hour cycle takes while testing.

48 seconds means:
1 simulated hour = 2 real seconds

You can make this even faster:

24 = full day in 24 seconds
48 = full day in 48 seconds
60 = full day in 1 minute
*/

const TEST_CYCLE_SECONDS = 48

/*
Start testing at 5 AM.

This means shortly after loading the page you will see:

Night → Day → Afternoon → Sunset → etc.
*/

const TEST_START_HOUR = 5

/*
====================================================
CLOCK
====================================================
*/

/*
In normal mode we only really need minute updates.

In test mode we update much faster so that the
transition looks smooth.
*/

const now = useNow({
  interval: TEST_MODE ? 100 : 60000
})

/*
Save the moment the page loaded.
*/

const testStartTime = Date.now()

/*
====================================================
CURRENT HOUR
====================================================

Normal mode:
Uses actual time.

Testing mode:
Simulates an entire 24-hour day.
*/

const currentHour = computed(() => {

  /*
  ================================================
  NORMAL REAL-TIME MODE
  ================================================
  */

  if (!TEST_MODE) {

    return (
      now.value.getHours() +
      now.value.getMinutes() / 60 +
      now.value.getSeconds() / 3600
    )
  }


  /*
  ================================================
  TEST MODE
  ================================================
  */

  const elapsedMilliseconds =
    now.value.getTime() -
    testStartTime

  const elapsedSeconds =
    elapsedMilliseconds / 1000

  /*
  Convert elapsed time into simulated hours.
  */

  const simulatedHours =
    (
      elapsedSeconds /
      TEST_CYCLE_SECONDS
    ) * 24

  /*
  % 24 makes the cycle repeat forever.
  */

  return (
    TEST_START_HOUR +
    simulatedHours
  ) % 24
})


/*
====================================================
BACKGROUND IMAGES
====================================================
*/

const backgrounds = {

  day:
    "/backgrounds/day.png",

  afternoon:
    "/backgrounds/afternoon.png",

  sunset:
    "/backgrounds/sunset.png",

  dusk:
    "/backgrounds/dusk.png",

  evening:
    "/backgrounds/evening.png",

  night:
    "/backgrounds/night.png"

}


/*
====================================================
HELPER FUNCTION
====================================================
*/

function getProgress(
  start,
  end,
  time
) {

  const progress =
    (time - start) /
    (end - start)

  return Math.min(
    Math.max(
      progress,
      0
    ),
    1
  )
}


/*
====================================================
TIME SYSTEM
====================================================

00:00 - 05:30
NIGHT

05:30 - 07:00
NIGHT → DAY

07:00 - 11:00
DAY

11:00 - 12:00
DAY → AFTERNOON

12:00 - 16:00
AFTERNOON

16:00 - 17:00
AFTERNOON → SUNSET

17:00 - 18:00
SUNSET

18:00 - 18:45
SUNSET → DUSK

18:45 - 19:30
DUSK

19:30 - 20:00
DUSK → EVENING

20:00 - 21:30
EVENING

21:30 - 22:30
EVENING → NIGHT

22:30 - 05:30
NIGHT
*/

const scene = computed(() => {

  const hour =
    currentHour.value


  /*
  ================================================
  NIGHT
  ================================================
  */

  if (
    hour >= 22.5 ||
    hour < 5.5
  ) {

    return {
      current: "night",
      next: "night",
      progress: 0
    }

  }


  /*
  ================================================
  NIGHT → DAY
  ================================================
  */

  if (
    hour >= 5.5 &&
    hour < 7
  ) {

    return {

      current: "night",

      next: "day",

      progress:
        getProgress(
          5.5,
          7,
          hour
        )

    }

  }


  /*
  ================================================
  DAY
  ================================================
  */

  if (
    hour >= 7 &&
    hour < 11
  ) {

    return {
      current: "day",
      next: "day",
      progress: 0
    }

  }


  /*
  ================================================
  DAY → AFTERNOON
  ================================================
  */

  if (
    hour >= 11 &&
    hour < 12
  ) {

    return {

      current: "day",

      next: "afternoon",

      progress:
        getProgress(
          11,
          12,
          hour
        )

    }

  }


  /*
  ================================================
  AFTERNOON
  ================================================
  */

  if (
    hour >= 12 &&
    hour < 16
  ) {

    return {

      current:
        "afternoon",

      next:
        "afternoon",

      progress: 0

    }

  }


  /*
  ================================================
  AFTERNOON → SUNSET
  ================================================
  */

  if (
    hour >= 16 &&
    hour < 17
  ) {

    return {

      current:
        "afternoon",

      next:
        "sunset",

      progress:
        getProgress(
          16,
          17,
          hour
        )

    }

  }


  /*
  ================================================
  SUNSET
  ================================================
  */

  if (
    hour >= 17 &&
    hour < 18
  ) {

    return {

      current: "sunset",

      next: "sunset",

      progress: 0

    }

  }


  /*
  ================================================
  SUNSET → DUSK
  ================================================
  */

  if (
    hour >= 18 &&
    hour < 18.75
  ) {

    return {

      current:
        "sunset",

      next:
        "dusk",

      progress:
        getProgress(
          18,
          18.75,
          hour
        )

    }

  }


  /*
  ================================================
  DUSK
  ================================================
  */

  if (
    hour >= 18.75 &&
    hour < 19.5
  ) {

    return {

      current: "dusk",

      next: "dusk",

      progress: 0

    }

  }


  /*
  ================================================
  DUSK → EVENING
  ================================================
  */

  if (
    hour >= 19.5 &&
    hour < 20
  ) {

    return {

      current:
        "dusk",

      next:
        "evening",

      progress:
        getProgress(
          19.5,
          20,
          hour
        )

    }

  }


  /*
  ================================================
  EVENING
  ================================================
  */

  if (
    hour >= 20 &&
    hour < 21.5
  ) {

    return {

      current:
        "evening",

      next:
        "evening",

      progress: 0

    }

  }


  /*
  ================================================
  EVENING → NIGHT
  ================================================
  */

  if (
    hour >= 21.5 &&
    hour < 22.5
  ) {

    return {

      current:
        "evening",

      next:
        "night",

      progress:
        getProgress(
          21.5,
          22.5,
          hour
        )

    }

  }


  /*
  Fallback
  */

  return {

    current: "night",

    next: "night",

    progress: 0

  }

})


/*
====================================================
BACKGROUND CURRENT IMAGE
====================================================
*/

const currentBackground =
  computed(() => {

    return backgrounds[
      scene.value.current
    ]

  })


/*
====================================================
BACKGROUND NEXT IMAGE
====================================================
*/

const nextBackground =
  computed(() => {

    return backgrounds[
      scene.value.next
    ]

  })


/*
====================================================
TRANSITION OPACITY
====================================================
*/

const nextOpacity =
  computed(() => {

    return scene.value.progress

  })


/*
====================================================
OPTIONAL TEST INFORMATION
====================================================

Useful if you want to temporarily display
the simulated time somewhere.
*/

const testTime =
  computed(() => {

    const hour =
      Math.floor(
        currentHour.value
      )

    const minutes =
      Math.floor(
        (
          currentHour.value -
          hour
        ) * 60
      )

    return (
      String(hour)
        .padStart(2, "0") +
      ":" +
      String(minutes)
        .padStart(2, "0")
    )

  })

</script>


<template>

  <main class="world">

    <!--
    ================================================
    CURRENT BACKGROUND
    ================================================
    -->

    <div
      class="background current-background"
      :style="{
        backgroundImage:
          `url(${currentBackground})`
      }"
    ></div>


    <!--
    ================================================
    NEXT BACKGROUND

    This image gradually appears over the
    current image.
    ================================================
    -->

    <div
      class="background next-background"
      :style="{
        backgroundImage:
          `url(${nextBackground})`,

        opacity:
          nextOpacity
      }"
    ></div>


    <!--
    ================================================
    POKÉ ARENA
    ================================================
    -->

    <button
      class="building-button arena-button"
      @click="router.push('/quiz')"
    >

      <span class="icon">
        ⚔️
      </span>

      <span class="button-text">

        <strong>
          Poké Arena
        </strong>

        <small>
          Take a Quiz
        </small>

      </span>

    </button>


    <!--
    ================================================
    POKÉ LAB
    ================================================
    -->

    <button
      class="building-button lab-button"
      @click="router.push('/study-decks')"
    >

      <span class="icon">
        📚
      </span>

      <span class="button-text">

        <strong>
          Poké Lab
        </strong>

        <small>
          Study Your Decks
        </small>

      </span>

    </button>


    <!--
    ================================================
    TRAINER HOUSE
    ================================================
    -->

    <button
      class="building-button house-button"
      @click="router.push('/dashboard')"
    >

      <span class="icon">
        🏠
      </span>

      <span class="button-text">

        <strong>
          Trainer House
        </strong>

        <small>
          View Your Progress
        </small>

      </span>

    </button>

  </main>

</template>


<style scoped>

/*
====================================================
WORLD
====================================================
*/

.world {
  position: relative;

  width: 100vw;
  height: 100vh;

  overflow: hidden;

  background: black;
}


/*
====================================================
BACKGROUND
====================================================
*/

.background {
  position: absolute;

  inset: 0;

  width: 100%;
  height: 100%;

  background-size: cover;

  background-position: center;

  background-repeat: no-repeat;
}


/*
====================================================
CURRENT IMAGE
====================================================
*/

.current-background {
  z-index: 1;
}


/*
====================================================
NEXT IMAGE
====================================================

Vue controls the opacity.

The transition smooths the small changes
that happen every minute.
*/

.next-background {
  z-index: 2;

  transition:
    opacity 2s linear;
}


/*
====================================================
BUILDING BUTTONS
====================================================
*/

.building-button {
  position: absolute;

  z-index: 10;

  display: flex;

  align-items: center;

  gap: 10px;

  padding:
    10px
    16px
    10px
    10px;

  border:
    2px solid
    rgba(255, 255, 255, 0.8);

  border-radius:
    18px;

  background:
    rgba(255, 255, 255, 0.9);

  backdrop-filter:
    blur(10px);

  color:
    #26365d;

  cursor:
    pointer;

  box-shadow:
    0 8px 20px
    rgba(0, 0, 0, 0.18);

  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}


/*
====================================================
ICON
====================================================
*/

.icon {
  display: flex;

  justify-content: center;
  align-items: center;

  width: 38px;
  height: 38px;

  border-radius: 12px;

  background:
    #ffe57c;

  font-size: 20px;
}


/*
====================================================
TEXT
====================================================
*/

.button-text {
  display: flex;

  flex-direction: column;

  align-items: flex-start;
}


.button-text strong {
  font-size: 14px;

  font-weight: 800;
}


.button-text small {
  margin-top: 2px;

  font-size: 10px;

  font-weight: 600;

  color:
    #65718c;
}


/*
====================================================
BUTTON HOVER
====================================================
*/

.building-button:hover {
  transform:
    translateY(-6px)
    scale(1.05);

  box-shadow:
    0 14px 28px
    rgba(0, 0, 0, 0.25);
}


/*
====================================================
BUTTON POSITIONS
====================================================

Adjust these depending on where the
buildings are in your final image.
*/


.arena-button {
  left: 16%;
  top: 30%;
}


.lab-button {
  left: 69%;
  top: 29%;
}


.house-button {
  right: 8%;
  top: 53%;
}


/*
====================================================
RESPONSIVE
====================================================
*/

@media (max-width: 900px) {

  .building-button {
    transform:
      scale(0.85);
  }

  .building-button:hover {
    transform:
      translateY(-4px)
      scale(0.9);
  }

}

</style>