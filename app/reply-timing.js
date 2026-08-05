(() => {
  const clamp = (minimum, maximum, value) => Math.max(minimum, Math.min(maximum, value));
  const score = (value, fallback) => Number.isFinite(Number(value)) ? clamp(0, 10, Number(value)) : fallback;

  const baseDelayByContact = {
    qian: 1000,
    shenyao: 1400,
    lichuan: 900,
    zhoutang: 1050,
    wensheng: 1150,
    sui: 1550,
    yecheng: 800
  };

  function calculate({ contactId, relationship = {}, communicationPulse = {}, channel = 'text', threadType = 'private' } = {}) {
    const continuity = (
      score(relationship.familiarity, 1) * .18
      + score(relationship.trust, 1) * .24
      + score(relationship.intimacy, 0) * .12
      + score(relationship.reciprocity, 0) * .16
      + score(relationship.safety, 1) * .20
      + score(relationship.romanticAttraction, 0) * .10
    );
    const reliability = score(communicationPulse.responseReliability, 5);
    const strain = score(relationship.strain, 1);
    const channelDelay = channel === 'voice' ? 350 : channel === 'photo' ? 180 : 0;
    const groupDelay = threadType === 'group' ? 120 : 0;
    const baseDelay = baseDelayByContact[contactId] ?? 1050;
    const relationshipDelay = (5 - continuity) * 75;
    const recentRhythmDelay = (5 - reliability) * 28;
    const strainDelay = strain * 32;
    const total = clamp(650, 2600, baseDelay + relationshipDelay + recentRhythmDelay + strainDelay + channelDelay + groupDelay);
    return Math.round(total / 50) * 50;
  }

  window.EchoReplyTiming = Object.freeze({ calculate });
})();
