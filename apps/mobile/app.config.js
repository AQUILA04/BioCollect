const apiUrl = process.env.EXPO_PUBLIC_BIOCOLLECT_API_URL ?? "";

module.exports = {
  expo: {
    name: "BioCollect Terrain",
    slug: "biocollect-terrain",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    scheme: "biocollect",
    plugins: ["expo-router"],
    experiments: { typedRoutes: true },
    extra: { biocollectApiUrl: apiUrl },
  },
};
