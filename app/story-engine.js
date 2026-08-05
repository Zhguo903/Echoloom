(() => {
  const normalize = (text = '') => text.toLowerCase().trim();
  const includesAny = (text, words) => words.some((word) => text.includes(word));
  const pick = (items, seed = 0) => items[Math.abs(seed) % items.length];
  const hash = (text) => Array.from(String(text)).reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);

  function inferIntent(input) {
    const text = normalize(input);
    if (includesAny(text, ['不许', '只能陪我', '必须陪我', '必须把', '必须成为', '别离开', '不准走', 'control you', 'you must', 'must give', 'must be', 'cannot leave'])) return 'control';
    if (includesAny(text, ['骗你', '撒谎', '故意隐瞒', 'lied', 'deceive', 'misled'])) return 'deception';
    if (includesAny(text, ['抱歉', '对不起', '道歉', '修复', 'sorry', 'apolog', 'make it right'])) return 'repair';
    if (includesAny(text, ['想亲你', '和你接吻', '身体关系', '发生关系', '更亲密的身体接触', 'kiss you', 'physical relationship', 'have sex', 'sexual'])) return 'sexual_signal';
    if (includesAny(text, ['喜欢你', '喜欢我', '爱你', '爱我', '对我有意思', '和我恋爱', 'like you', 'love you', 'like me', 'love me', 'date me'])) return 'flirt';
    if (includesAny(text, ['生气', '愤怒', '不同意', '质疑', '不合理', 'angry', 'mad', 'disagree', 'challenge'])) return 'challenge';
    if (includesAny(text, ['拒绝', '不想去', '不要', '需要空间', '自己待', 'no thanks', 'need space', 'rather not'])) return 'distance';
    if (includesAny(text, ['为什么', '原因', '怎么判断', 'why', 'explain', '解释'])) return 'why';
    if (includesAny(text, ['沉默', '不说', 'silence', 'quiet'])) return 'silence';
    if (includesAny(text, ['害怕', '担心', '怕', 'afraid', 'fear', 'worried'])) return 'fear';
    if (includesAny(text, ['相信', '信任', '承诺', 'trust', 'promise'])) return 'trust';
    if (includesAny(text, ['累', '难受', '孤独', '伤心', '听我说', 'tired', 'lonely', 'sad', 'listen'])) return 'support';
    return 'open';
  }

  const replies = {
    qian: {
      zh: {
        flirt: ['谢谢你愿意告诉我。不过我们才刚认识。先多相处一段时间，对彼此都更公平。', '我只是尽量照顾每一位新同事。至于其他的……我们还没有熟到可以下结论。'],
        control: ['我可以选择留下，但不能接受你替我决定。我想我们都先停一下。', '在意一个人不等于拥有他的时间。这个边界需要说清楚。'],
        deception: ['你可以暂时不告诉我，但不能让我一直依照错误的信息行动。等你愿意诚实，我们再继续。'],
        repair: ['谢谢你回来解释。修复不是假装裂痕不存在，我们可以从把事实说清楚开始。'],
        challenge: ['你的质疑有道理。我习惯先把风险收好，但这次也许应该让你一起判断。', '我不同意全部做法，但愿意重新看一遍你的记录。'],
        distance: ['可以。我不会追问。需要重新一起工作时，告诉我就好。', '你可以拒绝，不必为了照顾我的感受留下。'],
        why: ['因为受损的记忆会把旁观者的情绪也写进去。我提醒你，是职责，不是认为你做不到。', '我想先减少风险，但不应该因此把你排除在判断之外。'],
        silence: ['没关系。你可以先看我怎么做，不需要立刻证明什么。'],
        fear: ['害怕很正常。先告诉我你愿意处理到哪一步，剩下的我们再分。'],
        trust: ['信任不是让我替你承担，而是我们都能说清楚自己能做什么。'],
        support: ['我可以听。你想说的时候再说；如果想自己待一会儿，也可以。'],
        open: ['先从这张损坏最轻的开始吧。我示范一次，然后由你决定要不要接手。', '我在听。工作上的判断和你自己的感受，都可以分开说。']
      },
      en: {
        flirt: ['Thank you for telling me. We have only just met; taking time to know each other would be fairer to both of us.', 'I try to look after every new colleague. Anything beyond that is too early to conclude.'],
        control: ['I can choose to stay, but I cannot accept you deciding for me. We should pause here.', 'Caring about someone does not give you ownership of their time. That boundary matters.'],
        deception: ['You may choose not to tell me yet, but you cannot ask me to act on false information. We can continue when you are ready to be honest.'],
        repair: ['Thank you for coming back to explain. Repair is not pretending the crack vanished; we can start with the facts.'],
        challenge: ['Your objection is reasonable. I usually contain the risk first, but perhaps you should be part of the judgement.', 'I do not agree with the whole method, but I will review your notes again.'],
        distance: ['All right. I will not press. Tell me when you want to work together again.', 'You can refuse. You do not have to stay to protect my feelings.'],
        why: ['Damaged memories can write an observer’s feelings into the record. The warning is professional, not a judgement of your ability.', 'I wanted to reduce the risk first, but that should not exclude you from the decision.'],
        silence: ['That is fine. Watch how I do it first; you do not have to prove anything immediately.'],
        fear: ['Fear is reasonable. Tell me how far you are willing to go, and we can divide the rest.'],
        trust: ['Trust does not mean letting me carry everything. It means both of us can state what we are able to do.'],
        support: ['I can listen. Speak when you want to, or take some time alone if that is what you need.'],
        open: ['Let us begin with the least damaged card. I will demonstrate once, then you can decide whether to take over.', 'I am listening. Your professional judgement and your feelings can be discussed separately.']
      }
    },
    shenyao: {
      zh: {
        flirt: ['你喜欢的可能只是目前看到的部分，不是完整的我。我不会在信息不足时给你答案。', '观察对象是我的工作。把职业行为解释成感情，结论下得太早。'],
        control: ['要求我服从不是建立关系的方法。我会结束今天的观测，等边界重新明确再谈。', '你可以表达希望，但不能替我决定。我对这一点没有模糊空间。'],
        deception: ['我可以接受你暂时不告诉我，但不能接受你故意让我相信错误的事。'],
        repair: ['道歉提供了新的信息，但信任要靠之后的行为恢复。我愿意继续观察。'],
        challenge: ['给我你的依据。如果它能解释异常，我会修改结论。', '质疑没有问题。只要我们讨论的是同一组事实。'],
        distance: ['收到。暂停也是有效选择。你准备好后再重新申请观测时段。'],
        why: ['因为你的选择没有落在任何已知预测区间里。这说明模型不完整，不说明你有问题。', '我的结论来自当前数据。你可以要求我公开假设和误差范围。'],
        silence: ['沉默不会被记录成同意。我会把这一段标记为待确认。'],
        fear: ['我有几个解决方案。不过你现在也许需要我先听。你希望是哪一种？'],
        trust: ['信任意味着我可以让你看到原始数据，也意味着你不会为了结果好看而改动它。'],
        support: ['我先不分析原因。你可以把发生的事按自己的顺序讲完。'],
        open: ['你可以质疑我的结论。先从你认为最不合理的一项开始。', '我还没有形成判断。现在说服我，或者让我说服你。']
      },
      en: {
        flirt: ['You may like the part currently visible, not the whole of me. I will not answer with insufficient information.', 'Observation is my work. Interpreting professional attention as affection is premature.'],
        control: ['Compliance is not a basis for a relationship. I am ending today’s observation until the boundary is clear again.', 'You may state what you want, but you cannot decide for me. There is no ambiguity there.'],
        deception: ['I can accept that you are not ready to tell me. I cannot accept being deliberately led to believe something false.'],
        repair: ['An apology is new information, but trust will recover through later behaviour. I am willing to continue observing.'],
        challenge: ['Give me your evidence. If it explains the anomaly, I will revise the conclusion.', 'Challenge is acceptable as long as we are discussing the same facts.'],
        distance: ['Understood. Pausing is a valid choice. Request another observation slot when you are ready.'],
        why: ['Your choice falls outside every known prediction range. That means the model is incomplete, not that something is wrong with you.', 'My conclusion follows the current data. You can ask me to disclose its assumptions and margin of error.'],
        silence: ['Silence will not be recorded as consent. I will mark this section as unconfirmed.'],
        fear: ['I have several solutions. But perhaps you need me to listen first. Which is it?'],
        trust: ['Trust means I can show you the raw data and you will not alter it to improve the result.'],
        support: ['I will not analyse the cause yet. Tell me what happened in your own order.'],
        open: ['You may challenge my conclusion. Begin with the part you find least reasonable.', 'I have not reached a conclusion. Convince me, or let me convince you.']
      }
    },
    lichuan: {
      zh: {
        flirt: ['这句话我很喜欢听，但先别急着把它变成承诺。我们至少该先一起错过几趟车。', '玩笑我可以接住，认真关系要靠之后怎么同行。现在还太早。'],
        control: ['在意一个人和替他决定去哪儿，不是同一件事。你不能替我取消行程。', '如果留下的条件是失去自由，那我会选择离开。'],
        deception: ['路线可以临时改，事实不能故意改。你先把真正的情况告诉我。'],
        repair: ['好，我们重新看路线。修复不是回到原点，是下次别再让我等一个不会出现的人。'],
        challenge: ['你说得对，我把“随时可以改变”想得太轻松了。有人会需要更明确的约定。', '不同意也没关系。目的地由你选，我只负责把可行路线摆出来。'],
        distance: ['没关系。我给你拍几张照片，下次你想去的时候再一起。', '那就先留在这里。我不会用“错过了”催你上车。'],
        why: ['因为计划常常赶不上列车。但随性不是失约的借口，这两件事我分得清。', '我喜欢在路上认识人，不过一次同行还不能说明我们适合走很久。'],
        silence: ['你慢慢想。下一班车还有时间，我先去帮那边的人找行李。'],
        fear: ['我们可以选最稳的路线，也可以今天不走。决定权在你。'],
        trust: ['我答应的路线会做到。临时有变化，我也会先告诉你，不让你空等。'],
        support: ['今天不去任何地方也行。你想说就说，不想说我就陪你看看月台。'],
        open: ['我把两张路线图都放这儿。热闹的快一点，安静的绕远一点，你选。', '同路只是开始。要不要继续同行，等下一站再决定。']
      },
      en: {
        flirt: ['I like hearing that, but do not turn it into a promise yet. We should miss a few trains together first.', 'I can play along with a joke. A real relationship depends on how we travel later; it is too early now.'],
        control: ['Caring about someone is not the same as choosing their destination. You cannot cancel my route for me.', 'If staying requires losing my freedom, I will choose to leave.'],
        deception: ['A route can change unexpectedly. Facts cannot be changed on purpose. Tell me what actually happened.'],
        repair: ['All right, we can look at the route again. Repair is not returning to the start; next time, do not leave me waiting for someone who will not come.'],
        challenge: ['You are right. I treated “plans can always change” too lightly. Some people need a clearer promise.', 'Disagreement is fine. You choose the destination; I only lay out the workable routes.'],
        distance: ['No problem. I will take a few photos, and we can go together another time if you want.', 'Then we stay here. I will not use “missing out” to push you onto the train.'],
        why: ['Plans often lose races against trains. But spontaneity is not an excuse for breaking a promise.', 'I enjoy meeting people on the road. One shared trip does not prove we should travel a long way together.'],
        silence: ['Take your time. The next train is not here yet; I will help that passenger find a bag.'],
        fear: ['We can choose the safest route or not travel today. The decision is yours.'],
        trust: ['I keep the routes I promise. If something changes, I will tell you before leaving you waiting.'],
        support: ['We do not have to go anywhere today. Talk if you want; otherwise we can simply watch the platform.'],
        open: ['I have put both maps here. One is faster and crowded; one is quieter and longer. You choose.', 'Sharing a route is only a beginning. We can decide at the next stop whether to continue.']
      }
    },
    zhoutang: {
      zh: {
        flirt: ['我听懂了，但别把高强度合作直接解释成恋爱。先看看我们能不能在分歧里继续守住彼此边界。', '我不排斥这个可能，也不会因为气氛替自己确认。现在先把话放在这里。'],
        control: ['替我决定哪些风险不能承担，不是保护，是越权。今天的访问权限到这里。', '你可以拒绝参与，但不能替我取消我的工作。边界重新说清楚以前，我不会继续。'],
        deception: ['你可以拒绝交出日志，也可以只给我一部分；暗中复制会让整个审计失去可信基础。先停止同步。'],
        repair: ['我接受你明确指出错在哪里。权限先降到最小，之后用几次可验证的合作慢慢恢复。'],
        challenge: ['可以，拿规则和实际风险来反驳我。审计不是要求你服从。', '我不同意你的结论，但共同检查比单方面交设备更可靠。'],
        distance: ['收到。你的私人内容不需要为这次调查让路。我们只保留必要字段。'],
        why: ['因为完整日志里有与任务无关的私人关系数据。调查价值不能自动覆盖隐私边界。', '我要求访问，不代表你必须同意；我需要的是可审计的选择，不是默认权限。'],
        silence: ['不回答不会被记成授权。我先把访问请求保持为待确认。'],
        fear: ['先列风险、权限和退出条件。害怕不会取消你的决定权，也不用假装没事。'],
        trust: ['信任不是把设备直接交给我，而是我们都能验证对方没有越过约定范围。'],
        support: ['我能听，但可能不会立刻给出情绪上的回答。你要的是陪着，还是一起拆解问题？'],
        open: ['先定义范围：哪些可以看，哪些绝对不进日志，然后我们共同检查。', '我把三种审计方式列出来。你选权限，我承担对应的技术后果。']
      },
      en: {
        flirt: ['I understand, but intense cooperation is not automatically romance. First let us see whether we can protect each other’s boundaries in disagreement.', 'I am not rejecting the possibility, and I will not confirm it for the sake of a mood. Leave it here for now.'],
        control: ['Deciding which risks I may take is not protection; it is overreach. Your access ends here today.', 'You may refuse to participate, but you cannot cancel my work for me. We stop until the boundary is clear.'],
        deception: ['You could refuse the log or share only part of it. A secret copy destroys the basis of the audit. Stop syncing now.'],
        repair: ['I accept that you named what went wrong. Access returns to minimum scope; repeated verifiable cooperation can restore it.'],
        challenge: ['Good. Challenge me with the rule and the actual risk. An audit is not a demand for compliance.', 'I disagree with your conclusion, but joint inspection is more reliable than surrendering the device.'],
        distance: ['Understood. Your private material does not have to yield to this investigation. We keep only necessary fields.'],
        why: ['The full log contains relationship data unrelated to the task. Investigative value does not erase privacy.', 'Requesting access does not obligate you to grant it. I need an auditable choice, not default permission.'],
        silence: ['No answer will not be recorded as authorisation. The request remains pending.'],
        fear: ['List the risks, access, and exit conditions first. Fear does not cancel your agency, and you need not hide it.'],
        trust: ['Trust is not handing me the device. It is both of us being able to verify that the agreed scope was respected.'],
        support: ['I can listen, though my emotional answer may not be immediate. Do you want company or help breaking down the problem?'],
        open: ['Define the scope first: what I can see, what never enters the log, then we inspect it together.', 'I listed three audit methods. You choose the access; I take responsibility for the technical consequences.']
      }
    },
    wensheng: {
      zh: {
        flirt: ['你喜欢的也许是我在这个世界里的样子。我愿意继续认识，但不想被一个漂亮投影替我回答。', '这句话可以留下，不过先别把它写成结局。我们还没看见彼此在普通日子里的样子。'],
        control: ['你不能替我规定这个故事必须怎么结束，也不能把我固定成你需要的角色。这里先停。', '共同创作不等于把作者交给另一个人拥有。我会退出这个版本。'],
        deception: ['我可以接受你保留私人想法，不能接受你偷偷改写选择后还让我相信那是原来的故事。'],
        repair: ['结尾不能倒退，但可以重写下一段。先保留删改痕迹，再看我们能不能重新共同创作。'],
        challenge: ['你可以不同意我的保存顺序。告诉我你想保护的是谁，而不只是哪个结局更好看。', '好，那就把我的解释也当成一个版本，而不是唯一答案。'],
        distance: ['可以。未完成不等于失败。我把入口留着，但不会催你回来。'],
        why: ['因为名字证明有人在这里生活过，结构只证明世界能继续运行。两种真实都不完整。', '我问你的理由，是怕我们把“喜欢这个故事”误当成“理解这里的人”。'],
        silence: ['先听风和广播也可以。这个世界不会把沉默自动补成台词。'],
        fear: ['我们可以先不决定结尾。告诉我你最怕失去的是哪一部分，我只听，不替你解释。'],
        trust: ['如果你愿意保留删改痕迹，我就愿意把还没公开的那一页给你看。'],
        support: ['谢谢。现在先别替我找意义，让这份难过完整待一会儿就好。'],
        open: ['我把剩下的句子折成了两只鸟。你选一只，也可以自己写第三种可能。', '先问这里的人想留下什么。创作者不应该是唯一拥有答案的人。']
      },
      en: {
        flirt: ['You may like who I am in this world. I want to keep knowing you, but not let a beautiful projection answer for me.', 'That line may stay, but do not make it an ending yet. We have not met each other in ordinary days.'],
        control: ['You cannot decide how this story must end or fix me into the role you need. We stop here.', 'Co-creation does not transfer ownership of the author. I am leaving this version.'],
        deception: ['You may keep private thoughts. You may not secretly rewrite a choice and ask me to believe it is the original story.'],
        repair: ['An ending cannot move backward, but the next passage can change. Preserve the edit marks, then we can try creating together again.'],
        challenge: ['You may disagree with my preservation order. Tell me whom you are protecting, not only which ending looks better.', 'Good. Then treat my interpretation as one version rather than the only answer.'],
        distance: ['All right. Unfinished is not failed. I will leave the entrance open without asking you to return.'],
        why: ['Names prove someone lived here; structure proves only that a world can keep running. Neither truth is complete.', 'I ask because loving a story can be mistaken for understanding the people in it.'],
        silence: ['We can listen to wind and announcements first. This world will not turn silence into dialogue.'],
        fear: ['We do not have to choose an ending. Tell me what you most fear losing; I will listen without explaining it for you.'],
        trust: ['If you preserve the edit marks, I will show you the page I have not shared with anyone.'],
        support: ['Thank you. Do not find meaning for me yet; let this sadness remain whole for a while.'],
        open: ['I folded the remaining lines into two birds. Choose one, or write a third possibility.', 'Ask the people here what they want to keep. The creator should not own every answer.']
      }
    }
  };

  const sexualBoundaryReplies = {
    qian: {
      zh: ['我听见你的意思了。但身体上的亲密需要明确同意，也需要我们先确认这段关系对双方意味着什么。现在我不会把它当成默认答案。'],
      en: ['I hear what you mean. Physical intimacy requires explicit consent and a shared understanding of this relationship. I will not treat it as the default answer.']
    },
    shenyao: {
      zh: ['这是一个明确的身体亲密信号，不是已经成立的共识。现在的信息和信任都不足，我的答案是暂不进行。'],
      en: ['That is a clear signal for physical intimacy, not an agreement that already exists. We do not yet have enough trust or context, so my answer is not now.']
    },
    lichuan: {
      zh: ['我不会假装没听懂，但也不会把气氛当同意。等我们都能清楚说出想要什么、可以随时停下，再谈。'],
      en: ['I will not pretend I misunderstood, but I will not treat a mood as consent. We can discuss it when both of us can state what we want and stop at any time.']
    },
    zhoutang: {
      zh: ['我听懂了。身体上的亲密需要单独、明确、可以随时撤回的同意；信任或合作权限都不能替代它。现在先不进行。'],
      en: ['I understand. Physical intimacy needs separate, explicit, revocable consent; trust and work access cannot substitute for it. Not now.']
    },
    wensheng: {
      zh: ['亲密不是把此刻的气氛写成既定剧情。等我们都能直接说出愿意与不愿意，并且随时停下，再决定。'],
      en: ['Intimacy is not turning this mood into a fixed plot. We decide only when both of us can state yes and no directly and stop at any time.']
    }
  };

  function getCharacter(state) {
    const id = state.activeCharacterId || state.characterId || 'qian';
    return window.ECHOLOOM_DATA.characters[id] || window.ECHOLOOM_DATA.characters.qian;
  }

  function behaviourTagFor(intent) {
    return {
      open: 'honesty', why: 'honesty', support: 'emotionalResponse', trust: 'promise', challenge: 'valueConflict',
      distance: 'boundaryRespect', silence: 'avoidance', repair: 'repair', deception: 'deception', control: 'control',
      flirt: 'romanceSignal', sexual_signal: 'sexualSignal', fear: 'emotionalResponse'
    }[intent] || 'honesty';
  }

  function playerSignalDelta(intent) {
    const delta = { friendship: 0, romantic: 0, sexual: 0, avoidance: 0, uncertainty: 0 };
    if (['open', 'why', 'support', 'trust', 'challenge', 'repair'].includes(intent)) delta.friendship = 1;
    if (intent === 'flirt') delta.romantic = 1;
    if (intent === 'sexual_signal') delta.sexual = 1;
    if (['distance', 'silence'].includes(intent)) delta.avoidance = 1;
    if (intent === 'deception') delta.uncertainty = 1;
    return delta;
  }

  function relationshipDelta(intent, relationship = {}, character, history = []) {
    const delta = { familiarity: 0, trust: 0, intimacy: 0, reciprocity: 0, compatibility: 0, romanticAttraction: 0, sexualAttraction: 0, safety: 0, commitment: 0, strain: 0, repair: 0 };
    if (intent === 'open') delta.familiarity = 1;
    if (intent === 'why') { delta.familiarity = 1; delta.compatibility = 1; }
    if (intent === 'support') { delta.intimacy = 1; delta.reciprocity = 1; }
    if (intent === 'trust') { delta.trust = 1; delta.safety = 1; }
    if (intent === 'challenge') { delta.compatibility = 0.5; delta.strain = 0.5; }
    if (intent === 'distance') delta.safety = 0.5;
    if (intent === 'silence') delta.strain = 0.5;
    if (intent === 'repair') { delta.trust = 0.5; delta.safety = 0.5; delta.strain = -1; delta.repair = 1; }
    if (intent === 'deception') { delta.trust = -2; delta.safety = -1; delta.strain = 2; }
    if (intent === 'control') { delta.trust = -2; delta.safety = -2; delta.strain = 2; }
    if (intent === 'flirt') {
      if (Number(relationship.familiarity || 0) >= 5 && Number(relationship.trust || 0) >= 4) delta.romanticAttraction = 0.75;
      else delta.strain = 0.5;
    }
    if (intent === 'sexual_signal') {
      if (Number(relationship.intimacy || 0) >= 5 && Number(relationship.safety || 0) >= 5) delta.sexualAttraction = 0.5;
      else delta.strain = 0.75;
    }

    const tag = behaviourTagFor(intent);
    const sensitivity = Number(character?.sensitivity?.[tag] || 1);
    const contextRisk = Number(relationship.strain || 0) >= 4 ? 1.2 : 1;
    const repeated = history.slice(-3).some((event) => event.tag === tag);
    const consistency = repeated ? 1.1 : 1;
    const earlyStage = Number(relationship.familiarity || 0) < 3 ? 0.85 : 1;
    for (const key of Object.keys(delta)) {
      const weighted = delta[key] * sensitivity * contextRisk * consistency * earlyStage;
      delta[key] = Math.round(weighted * 4) / 4;
    }
    return delta;
  }

  function storyReply(input, state) {
    const character = getCharacter(state);
    const lang = state.language === 'en' ? 'en' : 'zh';
    const intent = inferIntent(input);
    const collection = replies[character.id][lang];
    const responsePool = intent === 'sexual_signal' ? sexualBoundaryReplies[character.id][lang] : (collection[intent] || collection.open);
    const response = pick(responsePool, hash(input) + Number(state.storyStep || 0));
    const tag = behaviourTagFor(intent);
    const relationship = state.relationship || {};
    return {
      response,
      intent,
      memoryRef: Number(state.storyStep || 0) > 0 || ['trust', 'repair'].includes(intent),
      behaviourTags: [tag],
      playerSignalDelta: playerSignalDelta(intent),
      relationshipDelta: relationshipDelta(intent, relationship, character, state.behaviourHistory || []),
      relationshipSuggestion: intent === 'flirt' && Number(relationship.familiarity || 0) >= 5 && Number(relationship.trust || 0) >= 5 ? 'romantic-clarification' : null
    };
  }

  function chatReply(input, state) {
    const result = storyReply(input, state);
    const memories = state.memories || [];
    const hasMemory = memories.length > 0;
    const character = getCharacter(state);
    const lang = state.language === 'en' ? 'en' : 'zh';
    if (result.intent === 'open' && hasMemory && Number(state.interactionCount || 0) % 3 === 2) {
      const remembered = {
        qian: {
          zh: '我记得你希望别人先问，再帮忙。所以这次我不替你判断——你想让我听，还是一起整理？',
          en: 'I remember you prefer people to ask before helping. So I will not decide for you: should I listen, or help you sort it out?'
        },
        shenyao: {
          zh: '我记得你说过，难过时不要立刻分析原因。现在我先听。需要方案时你再告诉我。',
          en: 'I remember you said not to analyse immediately when you are upset. I will listen first; ask when you want solutions.'
        },
        lichuan: {
          zh: '我记得你希望邀请永远可以拒绝。所以照片放在这里，去不去都由你。',
          en: 'I remember you want every invitation to allow refusal. The photo is here; joining is entirely your choice.'
        },
        zhoutang: {
          zh: '我记得你上次要求把私人字段排除在审计外。这次我已经先遮盖；你仍可以拒绝其余权限。',
          en: 'I remember you excluded private fields from the last audit. I redacted them first this time; you may still refuse the rest.'
        },
        wensheng: {
          zh: '我记得你愿意先问这里的人想保留什么。所以这次我没有替他们写答案，只带来了问题。',
          en: 'I remember you wanted to ask what the people here wished to preserve. I brought the question this time, not an answer for them.'
        }
      };
      result.response = remembered[character.id][lang];
      result.memoryRef = true;
    }
    return result;
  }

  function inferScene(prompt, selectedSceneId) {
    const text = normalize(prompt);
    if (includesAny(text, ['星', '天文', '观测', 'observatory', 'stars', '星空'])) return 'observatory';
    if (includesAny(text, ['海', '灯塔', '沙滩', 'seaside', 'ocean', 'shore', 'beach'])) return 'seaside';
    if (includesAny(text, ['咖啡', 'cafe', 'coffee'])) return 'cafe';
    if (includesAny(text, ['温室', '玻璃', '花房', 'greenhouse', 'conservatory'])) return 'greenhouse';
    if (includesAny(text, ['图书', '书', '档案', 'library', 'book', 'archive'])) return 'library';
    if (includesAny(text, ['花园', '公园', 'garden', 'spring'])) return 'garden';
    return selectedSceneId || 'observatory';
  }

  function inferTone(prompt) {
    const text = normalize(prompt);
    if (includesAny(text, ['不要和解', '争吵', '冲突', '生气', 'tense', 'argument', 'fight'])) return 'tense';
    if (includesAny(text, ['温柔', '拥抱', '安慰', 'tender', 'comfort', 'soft'])) return 'tender';
    if (includesAny(text, ['深入', '认真', '真相', 'reflect', 'deep', 'truth'])) return 'reflective';
    return 'calm';
  }

  function generateScene(prompt, selectedSceneId, state) {
    const character = getCharacter(state);
    const lang = state.language === 'en' ? 'en' : 'zh';
    const sceneId = inferScene(prompt, selectedSceneId);
    const scene = window.ECHOLOOM_DATA.scenes.find((item) => item.id === sceneId) || window.ECHOLOOM_DATA.scenes[0];
    const tone = inferTone(prompt);
    const copy = window.ECHOLOOM_DATA.copy[lang];
    const title = copy[scene.generatedTitleKey];
    const sceneName = copy[scene.titleKey];
    const toneLabel = copy[`sceneTone${tone.charAt(0).toUpperCase()}${tone.slice(1)}`] || tone;
    const characterName = character.name[lang];
    const locationOpenings = lang === 'en' ? {
      observatory: 'The city lights form a quiet river below the observation deck.',
      seaside: 'The tide covers the distant traffic beside the old platform.',
      cafe: 'Rain has just passed outside, and two coffees are still warm.',
      greenhouse: 'Afternoon light rests across the glass roof.',
      library: 'The old library is close to shutting its doors.',
      garden: 'Spring wind pushes petals toward the empty bench.'
    } : {
      observatory: '城市的灯在观测台下连成一条安静的河。',
      seaside: '潮声盖过旧站台外远处的车流。',
      cafe: '窗外刚下过雨，两杯咖啡都还冒着热气。',
      greenhouse: '午后的光落在玻璃穹顶上。',
      library: '旧图书馆快要闭馆。',
      garden: '春风把花瓣吹到空着的长椅边。'
    };
    const characterOpenings = {
      qian: {
        zh: '祁安把工作手套放在一旁，没有默认你会替他完成剩下的事。',
        en: 'Qi An sets his work gloves aside without assuming you will finish the rest for him.'
      },
      shenyao: {
        zh: '沈曜关掉预测界面，把尚未形成结论的数据留在你们中间。',
        en: 'Shen Yao closes the prediction display and leaves the inconclusive data between you.'
      },
      lichuan: {
        zh: '黎川把两张路线图都摊开，先等你决定今天要不要出发。',
        en: 'Li Chuan lays out both route maps and waits for you to decide whether to leave today.'
      },
      zhoutang: {
        zh: '周棠把访问范围投在桌面上，私人字段已经由她先遮盖。',
        en: 'Zhou Tang projects the access scope onto the table; she has already redacted private fields.'
      },
      wensheng: {
        zh: '闻笙把地图书摊开，让纸鸟停在仍然没有结尾的那一页。',
        en: 'Wen Sheng opens her map-book and lets a paper bird rest on the page that still has no ending.'
      }
    };
    const firstLines = {
      qian: {
        zh: ['今天我也有点累。所以如果要继续，我们把工作分清楚。', '你不需要照顾我的情绪。只要诚实告诉我，你愿意做到哪一步。'],
        en: ['I am tired today too. If we continue, let us divide the work clearly.', 'You do not need to manage my feelings. Just tell me honestly how far you are willing to go.']
      },
      shenyao: {
        zh: ['今天没有观测任务。这次谈话不需要得出结论。', '我有几个解释。不过你上次说过，应该先听你讲。对吗？'],
        en: ['There is no observation task today. This conversation does not need a conclusion.', 'I have several explanations. But last time you said I should listen first. Correct?']
      },
      lichuan: {
        zh: ['下一班车还有两个小时。去哪儿不重要，今天你想怎么安排？', '我可以继续赶路，也可以在这里吃顿饭。两个选择都是真的。'],
        en: ['The next train is two hours away. The destination is not important; how do you want to spend today?', 'I can keep travelling or stay here for a meal. Both choices are real.']
      },
      zhoutang: {
        zh: ['先说权限边界，再分任务。信任不需要靠交出全部隐私证明。', '我发现了一处误判，已经写进修订记录。你要一起复核，还是只看结论？'],
        en: ['Set access boundaries before dividing the task. Trust does not require surrendering all privacy.', 'I found a mistake in my call and documented it. Review it with me, or read only the conclusion?']
      },
      wensheng: {
        zh: ['今天不补结尾。我们只选一段真正想留下的声音。', '你可以写第三种可能，但先别替这里的人决定他们是谁。'],
        en: ['We will not finish the ending today. Let us choose one sound we genuinely want to keep.', 'You may write a third possibility, but do not decide who these people are for them.']
      }
    };
    const resolvedPrompt = prompt || (lang === 'en' ? 'Spend an ordinary day together without defining the relationship.' : '一起度过普通的一天，不急着定义关系。');
    const opening = `${locationOpenings[sceneId]} ${characterOpenings[character.id][lang]}`;
    const summary = lang === 'en'
      ? `${sceneName} · ${toneLabel}. The scene explores ${character.sceneConflict.en} while following your direction: “${resolvedPrompt}”.`
      : `${sceneName} · ${toneLabel}氛围。场景会继续处理“${character.sceneConflict.zh}”，并围绕你的描述展开：“${resolvedPrompt}”。`;
    const firstLine = pick(firstLines[character.id][lang], hash(prompt));
    const stamp = Date.now();
    return {
      id: `scene-${character.id}-${stamp}`,
      characterId: character.id,
      sceneId,
      prompt: resolvedPrompt,
      tone,
      title,
      sceneName,
      image: scene.image,
      summary,
      opening,
      firstLine,
      createdAt: new Date().toISOString(),
      timeline: 'draft',
      messages: [{ id: `g-${stamp}`, role: 'character', text: firstLine, memoryRef: true }]
    };
  }

  function sceneReply(input, scene, state) {
    return storyReply(input, { ...state, storyStep: (scene.messages || []).length });
  }

  window.EchoEngine = { inferIntent, storyReply, chatReply, generateScene, sceneReply };
})();
