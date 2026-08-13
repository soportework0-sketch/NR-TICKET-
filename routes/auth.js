const express = require("express");
const router = express.Router();

router.get("/login", (req, res) => {
    res.redirect("/auth/discord");
});

router.get("/discord", (req, res) => {
    const params = new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        redirect_uri: process.env.REDIRECT_URI,
        response_type: "code",
        scope: "identify guilds"
    });

    res.redirect(
        `https://discord.com/oauth2/authorize?${params.toString()}`
    );
});

router.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

module.exports = router;
