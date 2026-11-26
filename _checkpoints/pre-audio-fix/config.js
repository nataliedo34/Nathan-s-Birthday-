/* Central music map — drop your own MP3/WAV files into audio/tracks/ and update paths here.
   Official Chiikawa OST is copyrighted; bundled loops are original soft park themes you can replace anytime. */
window.PARK_AUDIO_CONFIG = {
  storageKey: "nates-birthday-park-audio-v1",
  defaultVolume: 0.55,
  crossfadeMs: 1400,
  ambienceVolume: 0.16,
  tracks: {
    intro: {
      file: "audio/tracks/intro.wav",
      title: "A Little Beginning",
      mood: "sweet"
    },
    top: {
      file: "audio/tracks/park.wav",
      title: "Nate's Birthday Park",
      mood: "playful"
    },
    topNight: {
      file: "audio/tracks/park-night.wav",
      title: "Park Under the Moon",
      mood: "night"
    },
    letter: {
      file: "audio/tracks/post.wav",
      title: "Letters from Home",
      mood: "gentle"
    },
    reasons: {
      file: "audio/tracks/jar.wav",
      title: "Notes in a Jar",
      mood: "musicbox"
    },
    album: {
      file: "audio/tracks/album.wav",
      title: "Memory Pages",
      mood: "piano"
    },
    snacks: {
      file: "audio/tracks/cafe.wav",
      title: "Café Afternoon",
      mood: "cafe"
    },
    wishes: {
      file: "audio/tracks/stage.wav",
      title: "Birthday Stage",
      mood: "party"
    },
    play: {
      file: "audio/tracks/midway.wav",
      title: "Usagi Arcade",
      mood: "arcade"
    },
    garden: {
      file: "audio/tracks/garden.wav",
      title: "Wish Garden",
      mood: "dreamy"
    },
    ending: {
      file: "audio/tracks/ending.wav",
      title: "Lanterns for You",
      mood: "ending"
    }
  },
  ambience: {
    day: { file: "audio/tracks/birds.wav", title: "Day birds" },
    night: { file: "audio/tracks/crickets.wav", title: "Night crickets" }
  }
};
