mod locale;
mod persona;
mod templates;

pub use locale::{
    chat_instruction, chat_system_prompt, normalize_locale, template_chat_empty,
    template_chat_reply, template_utterance, utterance_instruction, utterance_system_prompt,
};
pub use persona::persona_summary;
pub(crate) use templates::{local_chat_prompt, local_utterance_prompt};
